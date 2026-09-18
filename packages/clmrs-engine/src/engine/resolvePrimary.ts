import type { DetectionStatus, Severity, TriggeredRule } from '../types';
import { SEVERITY_RANK, STATUS_RANK } from '../types';

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function maxStatus(a: DetectionStatus, b: DetectionStatus): DetectionStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export function resolveHighestSeverity(signals: TriggeredRule[]): Severity {
  let s: Severity = 'INFO';
  for (const r of signals) {
    s = maxSeverity(s, r.severity);
  }
  return s;
}

export function resolveHighestStatus(signals: TriggeredRule[]): DetectionStatus {
  let s: DetectionStatus = 'NO_CASE_DETECTED';
  for (const r of signals) {
    if (r.detectionStatus) s = maxStatus(s, r.detectionStatus);
  }
  return s;
}

/** Monotonicity helper for tests: severity never drops when critical evidence is added. */
export function severityIsMonotonic(base: Severity, withCritical: Severity): boolean {
  return SEVERITY_RANK[withCritical] >= SEVERITY_RANK[base];
}
