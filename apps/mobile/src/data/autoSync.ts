import { checkConnectivity } from '../services/authService';
import { getStoredSession } from '../services/secureStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStatusStore } from '../stores/useSyncStatusStore';
import { isDemoModeEnabled } from './demoMode';
import { getDatabase } from './db';
import {
  canAttemptRemoteSync,
  resolveCooperativeId,
  runFullSync,
} from './syncService';
import { listUnresolvedConflicts } from './syncConflicts';

const DEBOUNCE_MS = 1200;
const CONNECTIVITY_POLL_MS = 30_000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
let rerunAfter = false;
let pendingAccountId: string | null = null;

async function countPending(accountId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM sync_outbox WHERE account_id = ? AND transfer_status = 'pending'`,
    [accountId]
  );
  return row?.c ?? 0;
}

async function countOutboxErrors(accountId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM sync_outbox
     WHERE account_id = ? AND transfer_status = 'pending' AND last_error IS NOT NULL`,
    [accountId]
  );
  return row?.c ?? 0;
}

async function refreshUiCounts(accountId: string): Promise<number> {
  const [pending, errorCount, conflicts] = await Promise.all([
    countPending(accountId),
    countOutboxErrors(accountId),
    listUnresolvedConflicts(accountId),
  ]);
  useSyncStatusStore.getState().setCounts({
    pendingCount: pending,
    errorCount,
    conflictCount: conflicts.length,
  });
  return pending;
}

/**
 * Schedule a background full sync (push then pull) when the device is online.
 * Debounced so a multi-row transaction only triggers one attempt.
 */
export function requestAutoSync(accountId: string): void {
  if (!accountId || accountId === 'local-account') return;
  pendingAccountId = accountId;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushAutoSync();
  }, DEBOUNCE_MS);
}

/** Start periodic connectivity refresh + auto-sync while the app is in foreground. */
export function startAutoSyncPolling(accountId: string): () => void {
  if (!accountId || accountId === 'local-account') return () => undefined;
  pendingAccountId = accountId;
  stopAutoSyncPolling();
  void flushAutoSync();
  pollTimer = setInterval(() => {
    void flushAutoSync();
  }, CONNECTIVITY_POLL_MS);
  return () => stopAutoSyncPolling();
}

export function stopAutoSyncPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function flushAutoSync(): Promise<void> {
  if (inFlight) {
    rerunAfter = true;
    return;
  }

  const accountId = pendingAccountId;
  if (!accountId) return;

  inFlight = true;
  rerunAfter = false;
  const syncUi = useSyncStatusStore.getState();

  try {
    if (await isDemoModeEnabled()) {
      await refreshUiCounts(accountId);
      return;
    }

    const online = await checkConnectivity(2000).catch(() => false);
    useAuthStore.setState({ isOffline: !online });

    if (!online) {
      await refreshUiCounts(accountId);
      syncUi.markSkippedOffline();
      return;
    }

    const session = await getStoredSession();
    if (!canAttemptRemoteSync(!!session)) {
      await refreshUiCounts(accountId);
      return;
    }

    syncUi.markSyncing();
    const coop = resolveCooperativeId(session?.profile?.cooperativeId);
    const result = await runFullSync(accountId, coop);
    const pendingAfter = await refreshUiCounts(accountId);
    useSyncStatusStore.getState().markResult(result, pendingAfter);

    if (result.push.acked > 0 || result.pull.applied > 0) {
      useAuthStore.setState({ lastSyncAt: new Date().toISOString() });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    useSyncStatusStore.getState().markError(msg);
    try {
      await refreshUiCounts(accountId);
    } catch {
      /* ignore */
    }
  } finally {
    inFlight = false;
    if (rerunAfter) {
      rerunAfter = false;
      void flushAutoSync();
    }
  }
}

export { refreshUiCounts };
