const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 30 * 60_000;

/** Retry delay after `attempts` failures: 30 s, 1 min, 2 min … capped at 30 min. */
export function outboxBackoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_MAX_MS);
}

/** True when a failed row may be retried now. */
export function isOutboxRowDue(
  row: { attempt_count: number; updated_at: string; last_error: string | null },
  now: number
): boolean {
  if (!row.last_error || !row.attempt_count) return true;
  const last = Date.parse(row.updated_at);
  if (Number.isNaN(last)) return true;
  return now - last >= outboxBackoffMs(row.attempt_count);
}
