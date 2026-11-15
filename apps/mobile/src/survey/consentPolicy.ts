import {
  isValidCameroonMobile,
  type OtherHouseholdPhoneStatus,
  type RespondentPhoneStatus,
} from './phoneConsent';

/**
 * Central consent flags. Screens read this object; they do not hardcode
 * signature or photo requirements.
 */
export const CONSENT_POLICY = {
  requiresConsent: true,
  requiresSignature: true,
  requiresPhoto: true,
  consentDefinitionId: 'DPR-EC-01011',
  version: 'v1',
} as const;

export type ConsentStatus = 'in_progress' | 'accepted' | 'declined';

/** Official pre-survey step. `ready` means the questionnaire may open. */
export type ConsentStep =
  | 'resume'
  | 'intro'
  | 'decision'
  | 'contact'
  | 'signature'
  | 'photo'
  | 'recap'
  | 'declined'
  | 'ready';

export type ConsentSnapshot = {
  presentedConfirmed: boolean;
  respondentName: string | null;
  status: ConsentStatus | null;
  respondentPhoneStatus: RespondentPhoneStatus | null;
  respondentPhone: string | null;
  otherHouseholdPhoneStatus: OtherHouseholdPhoneStatus | null;
  otherHouseholdPhone: string | null;
  hasSignature: boolean;
  hasPhoto: boolean;
};

export const EMPTY_CONSENT: ConsentSnapshot = {
  presentedConfirmed: false,
  respondentName: null,
  status: null,
  respondentPhoneStatus: null,
  respondentPhone: null,
  otherHouseholdPhoneStatus: null,
  otherHouseholdPhone: null,
  hasSignature: false,
  hasPhoto: false,
};

export type ConsentListPhase = 'todo' | 'consent_pending' | 'declined' | 'in_progress' | 'done';

export function respondentPhoneComplete(
  status: RespondentPhoneStatus | null,
  phone: string | null
): boolean {
  if (status === 'no_phone' || status === 'refused') return true;
  // Provided without a number: recorded by another agent, who keeps the number private.
  if (status === 'provided') return phone == null || isValidCameroonMobile(phone);
  return false;
}

export function otherHouseholdPhoneComplete(
  status: OtherHouseholdPhoneStatus | null,
  phone: string | null
): boolean {
  if (status === 'no_other_phone' || status === 'refused') return true;
  if (status === 'provided') return phone == null || isValidCameroonMobile(phone);
  return false;
}

export function consentFlowSteps(): Array<'intro' | 'decision' | 'contact' | 'signature' | 'photo' | 'recap'> {
  const steps: Array<'intro' | 'decision' | 'contact' | 'signature' | 'photo' | 'recap'> = [
    'intro',
    'decision',
    'contact',
  ];
  if (CONSENT_POLICY.requiresSignature) steps.push('signature');
  if (CONSENT_POLICY.requiresPhoto) steps.push('photo');
  steps.push('recap');
  return steps;
}

export function progressSteps(): Array<'intro' | 'decision' | 'contact' | 'signature' | 'photo'> {
  return consentFlowSteps().filter(
    (s): s is 'intro' | 'decision' | 'contact' | 'signature' | 'photo' => s !== 'recap'
  );
}

export function consentStepCount(): number {
  return progressSteps().length;
}

export function consentStepIndex(step: ConsentStep): number {
  const i = progressSteps().indexOf(step as 'intro');
  return i < 0 ? consentStepCount() : i + 1;
}

export function previousConsentStep(step: ConsentStep): ConsentStep | null {
  const flow = consentFlowSteps();
  const i = flow.indexOf(step as 'intro');
  if (i <= 0) return null;
  return flow[i - 1] ?? null;
}

export function nextConsentStep(step: ConsentStep): ConsentStep | null {
  const flow = consentFlowSteps();
  const i = flow.indexOf(step as 'intro');
  if (i < 0 || i >= flow.length - 1) return null;
  return flow[i + 1] ?? null;
}

/** Questionnaire may open only when every required consent fact is stored. */
export function canStartSurvey(snapshot: ConsentSnapshot): boolean {
  if (!CONSENT_POLICY.requiresConsent) return true;
  if (snapshot.status !== 'accepted') return false;
  if (!snapshot.respondentName?.trim()) return false;
  if (!respondentPhoneComplete(snapshot.respondentPhoneStatus, snapshot.respondentPhone)) return false;
  if (!otherHouseholdPhoneComplete(snapshot.otherHouseholdPhoneStatus, snapshot.otherHouseholdPhone)) {
    return false;
  }
  if (CONSENT_POLICY.requiresSignature && !snapshot.hasSignature) return false;
  if (CONSENT_POLICY.requiresPhoto && !snapshot.hasPhoto) return false;
  return true;
}

/** First unfinished step. Does not erase a saved Oui when the agent goes back. */
export function resolveConsentStep(snapshot: ConsentSnapshot): ConsentStep {
  if (!CONSENT_POLICY.requiresConsent) return 'ready';
  if (snapshot.status === 'declined') return 'declined';
  if (!snapshot.presentedConfirmed) return 'intro';
  if (!snapshot.respondentName?.trim() || snapshot.status !== 'accepted') return 'decision';
  if (!respondentPhoneComplete(snapshot.respondentPhoneStatus, snapshot.respondentPhone)) return 'contact';
  if (!otherHouseholdPhoneComplete(snapshot.otherHouseholdPhoneStatus, snapshot.otherHouseholdPhone)) {
    return 'contact';
  }
  if (CONSENT_POLICY.requiresSignature && !snapshot.hasSignature) return 'signature';
  if (CONSENT_POLICY.requiresPhoto && !snapshot.hasPhoto) return 'photo';
  if (canStartSurvey(snapshot)) return 'ready';
  return 'recap';
}

export function hasConsentProgress(snapshot: ConsentSnapshot): boolean {
  return (
    snapshot.presentedConfirmed ||
    !!snapshot.respondentName?.trim() ||
    snapshot.status === 'accepted' ||
    snapshot.status === 'declined'
  );
}

export function consentListPhase(
  snapshot: ConsentSnapshot | null,
  responseStatus: 'todo' | 'in_progress' | 'done'
): ConsentListPhase {
  if (snapshot?.status === 'declined') return 'declined';
  if (responseStatus === 'done') return 'done';
  if (snapshot && hasConsentProgress(snapshot) && !canStartSurvey(snapshot)) return 'consent_pending';
  if (responseStatus === 'in_progress') return 'in_progress';
  return 'todo';
}

/**
 * Consent is given once per planter, at registration, and covers every questionnaire.
 * Stored in survey_consents with this questionnaire_id. Rows written per questionnaire
 * by earlier versions are still honoured.
 */
export const PLANTER_CONSENT_SCOPE = 'planteur';

export type ConsentRowSummary = {
  questionnaireId: string;
  status: ConsentStatus;
  snapshot: ConsentSnapshot;
  ready: boolean;
};

/**
 * Consent row that governs one questionnaire: the planter-level row, else an older refusal
 * of this questionnaire, else any complete older consent of the planter, else this
 * questionnaire's unfinished row.
 */
export function consentRowFor<T extends ConsentRowSummary>(rows: T[], questionnaireId: string): T | null {
  return (
    rows.find((row) => row.questionnaireId === PLANTER_CONSENT_SCOPE) ??
    rows.find((row) => row.questionnaireId === questionnaireId && row.status === 'declined') ??
    rows.find((row) => row.ready) ??
    rows.find((row) => row.questionnaireId === questionnaireId) ??
    null
  );
}

/** Consent fields that never leave the author's private copy (statuses are shared, numbers are not). */
const CONSENT_PHONE_NUMBER_KEYS = ['respondentPhone', 'otherHouseholdPhone', 'respondent_phone', 'other_household_phone'];

/** Consent payload shared with the other agents of the planter's site. */
export function withoutConsentPhones<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const shared: Record<string, unknown> = { ...payload };
  for (const key of CONSENT_PHONE_NUMBER_KEYS) delete shared[key];
  return shared as Partial<T>;
}
