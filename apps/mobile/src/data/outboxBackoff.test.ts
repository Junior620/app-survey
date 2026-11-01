import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOutboxRowDue, outboxBackoffMs } from './outboxBackoff';

describe('outbox backoff', () => {
  it('doubles from 30 s and caps at 30 min', () => {
    assert.equal(outboxBackoffMs(0), 0);
    assert.equal(outboxBackoffMs(1), 30_000);
    assert.equal(outboxBackoffMs(2), 60_000);
    assert.equal(outboxBackoffMs(20), 30 * 60_000);
  });

  it('retries a row without error at once and a failing row after its delay', () => {
    const t0 = Date.parse('2026-11-01T10:00:00.000Z');
    const updated_at = new Date(t0).toISOString();
    assert.equal(isOutboxRowDue({ attempt_count: 0, last_error: null, updated_at }, t0), true);
    const failing = { attempt_count: 3, last_error: 'offline', updated_at };
    assert.equal(isOutboxRowDue(failing, t0 + 60_000), false);
    assert.equal(isOutboxRowDue(failing, t0 + 120_000), true);
  });
});
