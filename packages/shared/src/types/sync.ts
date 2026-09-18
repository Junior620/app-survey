/** Business lifecycle — never conflate with transfer status */
export type BusinessStatus =
  | 'draft'
  | 'in_progress'
  | 'submitted'
  | 'needs_correction'
  | 'validated'
  | 'archived'
  | 'cancelled';

/** Local → remote transfer — never `acked` without server acknowledgement */
export type TransferStatus = 'pending' | 'sending' | 'acked' | 'error' | 'blocked';

export type RemoteServiceAvailability = 'not_configured' | 'unavailable' | 'available';

export type OutboxEntityType =
  | 'site'
  | 'secteur'
  | 'village'
  | 'planteur'
  | 'parcelle'
  | 'formation'
  | 'seance'
  | 'participation'
  | 'mission'
  | 'survey_response'
  | 'questionnaire'
  | 'questionnaire_version'
  | 'questionnaire_assignment'
  | 'attachment'
  | 'geometry_version'
  | 'detection_result'
  | 'critical_case'
  | 'remediation_case';

export type OutboxOperation = 'create' | 'update' | 'delete' | 'archive';

export interface SyncOutboxItem {
  id: string;
  accountId: string;
  entityType: OutboxEntityType;
  entityId: string;
  operation: OutboxOperation;
  payloadJson: string;
  dependsOn: string | null;
  transferStatus: TransferStatus;
  revision: number;
  idempotencyKey: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
}

export interface SyncServiceState {
  availability: RemoteServiceAvailability;
  message: string;
  lastAckAt: string | null;
}
