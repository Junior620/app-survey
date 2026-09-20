import { create } from 'zustand';
import type { FullSyncResult } from '../data/syncService';

export type SyncUiPhase = 'idle' | 'syncing' | 'error';

type SyncStatusState = {
  phase: SyncUiPhase;
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  lastSuccessAt: string | null;
  lastMessage: string | null;
  setCounts: (counts: {
    pendingCount: number;
    errorCount?: number;
    conflictCount?: number;
  }) => void;
  markSyncing: () => void;
  markResult: (result: FullSyncResult, pendingAfter: number) => void;
  markSkippedOffline: () => void;
  markError: (message: string) => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  phase: 'idle',
  pendingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  lastSuccessAt: null,
  lastMessage: null,

  setCounts: ({ pendingCount, errorCount, conflictCount }) =>
    set((s) => ({
      pendingCount,
      errorCount: errorCount ?? s.errorCount,
      conflictCount: conflictCount ?? s.conflictCount,
      phase: s.phase === 'syncing' ? s.phase : 'idle',
    })),

  markSyncing: () => set({ phase: 'syncing', lastMessage: null }),

  markResult: (result, pendingAfter) => {
    const failed = result.push.failed;
    const conflicts = result.conflictCount;
    if (failed > 0) {
      set({
        phase: 'error',
        pendingCount: pendingAfter,
        errorCount: failed,
        conflictCount: conflicts,
        lastMessage: result.push.errors[0] ?? 'Échec partiel d’envoi',
      });
      return;
    }
    set({
      phase: 'idle',
      pendingCount: pendingAfter,
      errorCount: 0,
      conflictCount: conflicts,
      lastSuccessAt: new Date().toISOString(),
      lastMessage:
        result.push.acked > 0 || result.pull.applied > 0
          ? `Envoi ${result.push.acked}/${result.push.attempted} · réception ${result.pull.applied}`
          : null,
    });
  },

  markSkippedOffline: () =>
    set({ phase: 'idle', lastMessage: 'Hors ligne — envoi reporté' }),

  markError: (message) =>
    set({ phase: 'error', lastMessage: message, errorCount: 1 }),
}));

export function formatLastSyncLabel(iso: string | null): string {
  if (!iso) return 'jamais';
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
