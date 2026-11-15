import * as SecureStore from 'expo-secure-store';
import { countPendingOutbox } from './repositories/outboxRepository';
import { deleteOperationsDatabase } from './db';

const LAST_ACCOUNT_KEY = 'scpb_last_account_v1';

/**
 * Local reads are shared between the agents of a site, so a phone must never keep the
 * data of another account. When a different agent signs in, the previous account's
 * database is deleted, unless it still has entries waiting to be sent (they are kept so
 * nothing is lost; the previous agent can sign in again to send them).
 */
export async function prepareDeviceForAccount(accountId: string): Promise<'same' | 'wiped' | 'kept_pending'> {
  let previous: string | null = null;
  try {
    previous = await SecureStore.getItemAsync(LAST_ACCOUNT_KEY);
  } catch {
    previous = null;
  }
  let outcome: 'same' | 'wiped' | 'kept_pending' = 'same';
  if (previous && previous !== accountId) {
    const pending = await countPendingOutbox(previous).catch(() => 0);
    if (pending > 0) {
      outcome = 'kept_pending';
    } else {
      await deleteOperationsDatabase();
      outcome = 'wiped';
    }
  }
  if (outcome !== 'kept_pending') {
    try {
      await SecureStore.setItemAsync(LAST_ACCOUNT_KEY, accountId);
    } catch {
      /* Checked again at the next sign-in. */
    }
  }
  return outcome;
}
