type OutboxListener = (accountId: string) => void;

let listener: OutboxListener | null = null;

/** autoSync registers this. The outbox must not import autoSync. */
export function setOutboxSyncListener(next: OutboxListener | null): void {
  listener = next;
}

export function notifyOutboxChanged(accountId: string): void {
  listener?.(accountId);
}
