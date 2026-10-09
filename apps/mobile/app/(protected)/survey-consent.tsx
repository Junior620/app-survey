import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppHeader, AppScreen, KeyboardAwareScrollView } from '../../src/components/common';
import { ConsentProgress } from '../../src/components/consent/ConsentProgress';
import { ConsentDeclinedStep } from '../../src/components/consent/steps/ConsentDeclinedStep';
import { ConsentDecisionStep } from '../../src/components/consent/steps/ConsentDecisionStep';
import { ConsentIntroStep } from '../../src/components/consent/steps/ConsentIntroStep';
import { ConsentResumeStep } from '../../src/components/consent/steps/ConsentResumeStep';
import { ConsentReviewStep } from '../../src/components/consent/steps/ConsentReviewStep';
import { ContactInformationStep } from '../../src/components/consent/steps/ContactInformationStep';
import { ParticipantPhotoStep } from '../../src/components/consent/steps/ParticipantPhotoStep';
import { SignatureStep } from '../../src/components/consent/steps/SignatureStep';
import type { SignaturePadHandle } from '../../src/components/consent/SignaturePad';
import { saveAttachmentFromUri } from '../../src/data/repositories/attachmentsRepository';
import {
  consentResumeStep,
  patchConsent,
  snapshotOf,
  type ConsentIdentity,
  type SurveyConsentRecord,
} from '../../src/data/repositories/surveyConsentsRepository';
import { promptUnsavedExit, Routes, useSmartBack } from '../../src/navigation';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLocaleStore } from '../../src/stores/useLocaleStore';
import { consentBody } from '../../src/survey/consentDefinitions';
import {
  hasConsentProgress,
  nextConsentStep,
  previousConsentStep,
  resolveConsentStep,
  type ConsentSnapshot,
  type ConsentStep,
} from '../../src/survey/consentPolicy';
import {
  isValidCameroonMobile,
  type OtherHouseholdPhoneStatus,
  type RespondentPhoneStatus,
} from '../../src/survey/phoneConsent';
import { colors, spacing } from '../../src/theme';

export default function SurveyConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useLocaleStore((s) => s.displayLocale);
  const params = useLocalSearchParams<{
    questionnaireId: string;
    versionNumber: string;
    siteId?: string;
    planteurId?: string;
    responseId?: string;
  }>();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const agentName = profile?.fullName?.trim() || user?.email || t('consent.agentFallback');
  const language = locale.startsWith('en') ? 'en' : 'fr';

  const [step, setStep] = useState<ConsentStep>('intro');
  const [record, setRecord] = useState<SurveyConsentRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const [presented, setPresented] = useState(false);
  const [name, setName] = useState('');
  const [respondentStatus, setRespondentStatus] = useState<RespondentPhoneStatus | null>(null);
  const [respondentPhone, setRespondentPhone] = useState('');
  const [otherStatus, setOtherStatus] = useState<OtherHouseholdPhoneStatus | null>(null);
  const [otherPhone, setOtherPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);
  const unsavedRef = useRef(false);
  const skipDirtyRef = useRef(false);
  const stepRef = useRef<ConsentStep>('intro');
  stepRef.current = step;

  const applyRecord = (saved: SurveyConsentRecord, flags?: { hasSignature: boolean; hasPhoto: boolean }) => {
    setRecord(saved);
    setPresented(saved.presentedConfirmed);
    setName(saved.respondentName ?? '');
    setRespondentStatus(saved.respondentPhoneStatus);
    setRespondentPhone(saved.respondentPhone ?? '');
    setOtherStatus(saved.otherHouseholdPhoneStatus);
    setOtherPhone(saved.otherHouseholdPhone ?? '');
    if (flags) setSnapshot(snapshotOf(saved, flags));
  };

  const identity = (): ConsentIdentity => ({
    accountId,
    planteurId: params.planteurId!,
    questionnaireId: params.questionnaireId!,
    versionNumber: String(params.versionNumber || '1'),
    language,
    agentId: accountId,
    agentNameSnapshot: agentName,
  });

  const leaveClean = () => {
    skipDirtyRef.current = true;
    unsavedRef.current = false;
    router.back();
  };

  const moveTo = (next: ConsentStep) => {
    unsavedRef.current = false;
    setPhotoUri(null);
    setStep(next);
  };

  const { goBack } = useSmartBack({
    onBeforeBack: () => {
      const current = stepRef.current;
      const discardTo = (next: ConsentStep | null) => {
        unsavedRef.current = false;
        setPhotoUri(null);
        if (next) setStep(next);
        else leaveClean();
      };
      if (!skipDirtyRef.current && unsavedRef.current) {
        const prev = previousConsentStep(current);
        promptUnsavedExit({
          isDirty: true,
          onDiscard: () => discardTo(prev),
        });
        return true;
      }
      if (current === 'declined' || current === 'resume') return false;
      const prev = previousConsentStep(current);
      if (!prev) return false;
      setStep(prev);
      return true;
    },
    onDirtyExit: () => false,
  });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!params.planteurId || !params.questionnaireId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const found = await consentResumeStep(accountId, params.planteurId, params.questionnaireId);
          if (!alive) return;
          setSnapshot(found.snapshot);
          if (found.record) applyRecord(found.record, {
            hasSignature: found.snapshot.hasSignature,
            hasPhoto: found.snapshot.hasPhoto,
          });
          if (found.step === 'declined') setStep('declined');
          else if (found.step === 'ready') setStep('recap');
          else if (found.record && hasConsentProgress(found.snapshot)) setStep('resume');
          else setStep(found.step);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, params.planteurId, params.questionnaireId])
  );

  const fail = (e: unknown) => {
    Alert.alert(t('consent.errorTitle'), e instanceof Error ? e.message : t('consent.errorBody'));
  };

  const onIntroContinue = async () => {
    if (!presented || busy || !params.planteurId) return;
    setBusy(true);
    try {
      const saved = await patchConsent(identity(), { presentedConfirmed: true, status: 'in_progress' });
      applyRecord(saved);
      if (saved.status === 'declined') {
        moveTo('declined');
        return;
      }
      moveTo('decision');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const persistDecline = async () => {
    setBusy(true);
    try {
      const saved = await patchConsent(identity(), {
        respondentName: name.trim(),
        status: 'declined',
        confirmDecline: record?.status === 'accepted',
      });
      applyRecord(saved);
      moveTo('declined');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const onNo = () => {
    if (!name.trim() || busy) return;
    if (record?.status === 'accepted') {
      Alert.alert(t('consent.changeTitle'), t('consent.changeBody'), [
        { text: t('consent.changeCancel'), style: 'cancel' },
        { text: t('consent.changeConfirm'), style: 'destructive', onPress: () => void persistDecline() },
      ]);
      return;
    }
    void persistDecline();
  };

  const onYes = async () => {
    if (!name.trim() || busy || !params.planteurId) return;
    setBusy(true);
    try {
      const saved = await patchConsent(identity(), {
        respondentName: name.trim(),
        status: 'accepted',
        presentedConfirmed: true,
      });
      applyRecord(saved);
      if (saved.status === 'declined') {
        moveTo('declined');
        return;
      }
      moveTo(nextConsentStep('decision') ?? 'contact');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const onContactContinue = async () => {
    if (!respondentStatus || !otherStatus) {
      setPhoneError(t('consent.phoneRequired'));
      return;
    }
    if (respondentStatus === 'provided' && !isValidCameroonMobile(respondentPhone)) {
      setPhoneError(t('consent.phoneInvalid'));
      return;
    }
    if (otherStatus === 'provided' && !isValidCameroonMobile(otherPhone)) {
      setPhoneError(t('consent.phoneInvalid'));
      return;
    }
    setPhoneError(null);
    setBusy(true);
    try {
      const saved = await patchConsent(identity(), {
        respondentPhoneStatus: respondentStatus,
        respondentPhone,
        otherHouseholdPhoneStatus: otherStatus,
        otherHouseholdPhone: otherPhone,
      });
      applyRecord(saved);
      moveTo(nextConsentStep('contact') ?? 'signature');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveSignature = async () => {
    if (!record || busy) return;
    if (padRef.current?.isEmpty()) {
      Alert.alert(t('consent.signatureEmptyTitle'), t('consent.signatureEmptyBody'));
      return;
    }
    setBusy(true);
    try {
      const svg = padRef.current?.toSvg() ?? '';
      const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
      const path = `${base}consent-signature-${record.id}.svg`;
      await FileSystem.writeAsStringAsync(path, svg);
      await saveAttachmentFromUri({
        accountId,
        authorId: accountId,
        entityType: 'consent_signature',
        entityId: record.id,
        sourceUri: path,
        mimeType: 'image/svg+xml',
        caption: 'consent-signature',
        accessLevel: 'restricted_protection',
      });
      moveTo(nextConsentStep('signature') ?? 'photo');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('consent.cameraDeniedTitle'), t('consent.cameraDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
    unsavedRef.current = true;
  };

  const usePhoto = async () => {
    if (!record || !photoUri || busy) return;
    setBusy(true);
    try {
      await saveAttachmentFromUri({
        accountId,
        authorId: accountId,
        entityType: 'consent_photo',
        entityId: record.id,
        sourceUri: photoUri,
        mimeType: 'image/jpeg',
        caption: 'consent-photo',
        accessLevel: 'restricted_protection',
      });
      moveTo(nextConsentStep('photo') ?? 'recap');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const startSurvey = () => {
    skipDirtyRef.current = true;
    unsavedRef.current = false;
    router.replace({
      pathname: Routes.surveyRun,
      params: {
        questionnaireId: params.questionnaireId,
        versionNumber: params.versionNumber,
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(params.planteurId ? { planteurId: params.planteurId } : {}),
        ...(params.responseId ? { responseId: params.responseId } : {}),
      },
    } as never);
  };

  const body = consentBody(language, agentName);

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title={t('consent.title')} subtitle={t('consent.subtitle')} onBack={goBack} />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.body}>
          <ConsentProgress step={step} />
          {step === 'resume' && snapshot ? (
            <ConsentResumeStep
              snapshot={snapshot}
              onContinue={() => {
                const missing = resolveConsentStep(snapshot);
                moveTo(missing === 'ready' ? 'recap' : missing);
              }}
            />
          ) : null}
          {step === 'intro' ? (
            <ConsentIntroStep
              body={body}
              presented={presented}
              onToggle={() => setPresented((v) => !v)}
              onContinue={() => void onIntroContinue()}
              busy={busy}
            />
          ) : null}
          {step === 'decision' ? (
            <ConsentDecisionStep
              name={name}
              onName={setName}
              onYes={() => void onYes()}
              onNo={onNo}
              busy={busy}
            />
          ) : null}
          {step === 'contact' ? (
            <ContactInformationStep
              respondentName={name.trim()}
              respondentStatus={respondentStatus}
              respondentPhone={respondentPhone}
              otherStatus={otherStatus}
              otherPhone={otherPhone}
              onRespondentStatus={setRespondentStatus}
              onRespondentPhone={setRespondentPhone}
              onOtherStatus={setOtherStatus}
              onOtherPhone={setOtherPhone}
              onContinue={() => void onContactContinue()}
              error={phoneError}
              busy={busy}
            />
          ) : null}
          {step === 'signature' ? (
            <SignatureStep
              padRef={padRef}
              busy={busy}
              onInkChange={(empty) => {
                unsavedRef.current = !empty;
              }}
              onValidate={() => void saveSignature()}
            />
          ) : null}
          {step === 'photo' ? (
            <ParticipantPhotoStep
              photoUri={photoUri}
              onTake={() => void takePhoto()}
              onUse={() => void usePhoto()}
              onRetake={() => void takePhoto()}
              busy={busy}
            />
          ) : null}
          {step === 'recap' ? (
            <ConsentReviewStep respondentName={name.trim()} onStart={startSurvey} busy={busy} />
          ) : null}
          {step === 'declined' ? <ConsentDeclinedStep onFinish={goBack} /> : null}
        </KeyboardAwareScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.s },
});
