import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canStartSurvey,
  consentListPhase,
  EMPTY_CONSENT,
  resolveConsentStep,
  type ConsentSnapshot,
} from './consentPolicy';
import {
  LEGACY_NO_PHONE,
  LEGACY_REFUSED_PHONE,
  normalizeCameroonMobile,
  phoneStatusToLegacyValue,
} from './phoneConsent';

function snap(partial: Partial<ConsentSnapshot>): ConsentSnapshot {
  return { ...EMPTY_CONSENT, ...partial };
}

const ready = snap({
  presentedConfirmed: true,
  respondentName: 'Jean Mbarga',
  status: 'accepted',
  respondentPhoneStatus: 'provided',
  respondentPhone: '+237677123456',
  otherHouseholdPhoneStatus: 'provided',
  otherHouseholdPhone: '+237699123456',
  hasSignature: true,
  hasPhoto: true,
});

describe('phone consent', () => {
  it('accepts a Cameroon mobile with or without +237', () => {
    assert.equal(normalizeCameroonMobile('6 77 12 34 56'), '+237677123456');
    assert.equal(normalizeCameroonMobile('+237677123456'), '+237677123456');
    assert.equal(normalizeCameroonMobile('00237677123456'), '+237677123456');
  });

  it('rejects landlines and legacy placeholder codes', () => {
    assert.equal(normalizeCameroonMobile('222123456'), null);
    assert.equal(normalizeCameroonMobile('00 00 00 00 00'), null);
    assert.equal(normalizeCameroonMobile('99 99 99 99 99'), null);
  });

  it('maps phone status to legacy export codes without storing them', () => {
    assert.equal(phoneStatusToLegacyValue('no_phone'), LEGACY_NO_PHONE);
    assert.equal(phoneStatusToLegacyValue('no_other_phone'), LEGACY_NO_PHONE);
    assert.equal(phoneStatusToLegacyValue('refused'), LEGACY_REFUSED_PHONE);
    assert.equal(phoneStatusToLegacyValue('provided', '677123456'), '+237677123456');
  });
});

describe('consent sequence', () => {
  it('case A: provided phones, signature and photo can start', () => {
    assert.equal(canStartSurvey(ready), true);
    assert.equal(resolveConsentStep(ready), 'ready');
  });

  it('case B: no phone still completes contact', () => {
    const snapshot = snap({
      ...ready,
      respondentPhoneStatus: 'no_phone',
      respondentPhone: null,
    });
    assert.equal(resolveConsentStep(snapshot), 'ready');
  });

  it('case C: refused phone still completes contact', () => {
    const snapshot = snap({
      ...ready,
      respondentPhoneStatus: 'refused',
      respondentPhone: null,
      otherHouseholdPhoneStatus: 'refused',
      otherHouseholdPhone: null,
    });
    assert.equal(canStartSurvey(snapshot), true);
  });

  it('case D: decline stops before the questionnaire', () => {
    const snapshot = snap({
      presentedConfirmed: true,
      respondentName: 'Jean Mbarga',
      status: 'declined',
    });
    assert.equal(resolveConsentStep(snapshot), 'declined');
    assert.equal(canStartSurvey(snapshot), false);
    assert.equal(consentListPhase(snapshot, 'todo'), 'declined');
  });

  it('case E: missing photo resumes at photo, not at the beginning', () => {
    const snapshot = snap({ ...ready, hasPhoto: false });
    assert.equal(resolveConsentStep(snapshot), 'photo');
    assert.equal(canStartSurvey(snapshot), false);
    assert.equal(consentListPhase(snapshot, 'todo'), 'consent_pending');
  });

  it('does not treat a saved yes as a refusal', () => {
    const snapshot = snap({
      presentedConfirmed: true,
      respondentName: 'Jean Mbarga',
      status: 'accepted',
    });
    assert.equal(resolveConsentStep(snapshot), 'contact');
    assert.notEqual(snapshot.status, 'declined');
  });

  it('blocks survey-run until the name is stored', () => {
    assert.equal(
      canStartSurvey(snap({ ...ready, respondentName: '  ' })),
      false
    );
  });

  it('keeps a finished questionnaire labelled done', () => {
    assert.equal(consentListPhase(ready, 'done'), 'done');
    assert.equal(consentListPhase(ready, 'in_progress'), 'in_progress');
    assert.equal(consentListPhase(null, 'todo'), 'todo');
  });
});
