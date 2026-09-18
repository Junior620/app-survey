import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  FormSurveyHeader,
  FormProgressBar,
  LocalSaveIndicator,
  type LocalSaveState,
  QuestionCard,
  FormTextField,
  FormUnitField,
  ChoiceCard,
  FormStepNav,
  PrimaryButton,
  StatusChip,
  SensitiveContentNotice,
  SemanticIcon,
  KeyboardAwareScrollView,
} from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';
import { haptics } from '../../src/utils/haptics';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { saveSurveyResponse } from '../../src/data/repositories/surveyResponsesRepository';

export type OptionChoice = 'OUI' | 'NON' | 'JE_NE_SAIS_PAS' | 'REFUS' | null;

type FieldErrors = {
  nomParcelle?: string;
  superficieHa?: string;
  presenceOmbrage?: string;
  moyenTransport?: string;
};

function formatTimeLabel(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function S22SectionsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});
  const { user, profile } = useAuthStore();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const draftIdRef = useRef<string | null>(null);

  const [currentStep, setCurrentStep] = useState(2);
  const totalSteps = 5;

  // Consent refusal UI retained below for ethical CLMRS flow (no demo toggle)
  const [isConsentRefused] = useState(false);

  const [nomParcelle, setNomParcelle] = useState('Parcelle Principale Soubré P-001');
  const [superficieDisplay, setSuperficieDisplay] = useState('3,5');
  const [superficieNormalized, setSuperficieNormalized] = useState('3.5');
  const [anneePlantation, setAnneePlantation] = useState('2018');
  const [moyenTransportChoice, setMoyenTransportChoice] = useState<OptionChoice>(null);
  const [presenceOmbrageChoice, setPresenceOmbrageChoice] = useState<OptionChoice>(null);

  const [saveState, setSaveState] = useState<LocalSaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attemptedNext, setAttemptedNext] = useState(false);

  const persistDraft = useCallback(async (): Promise<boolean> => {
    setSaveState('saving');
    try {
      const payload = {
        nomParcelle,
        superficieNormalized,
        anneePlantation,
        presenceOmbrageChoice,
        moyenTransportChoice,
      };
      const saved = await saveSurveyResponse({
        accountId,
        responseId: draftIdRef.current,
        siteId: currentSiteId,
        templateKey: 'legacy_plantation_ah',
        templateVersion: '1',
        targetType: 'parcelle',
        businessStatus: 'draft',
        currentStep,
        answers: payload as never,
        meta: { section: 'C' },
      });
      draftIdRef.current = saved.id;
      setSavedAt(formatTimeLabel(new Date()));
      setSaveState('saved');
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, [
    accountId,
    currentSiteId,
    currentStep,
    nomParcelle,
    superficieNormalized,
    anneePlantation,
    presenceOmbrageChoice,
    moyenTransportChoice,
  ]);

  const validateStep = useCallback((): { ok: boolean; firstKey?: keyof FieldErrors } => {
    const next: FieldErrors = {};
    if (!nomParcelle.trim()) next.nomParcelle = 'Indiquez le nom ou code de la parcelle.';
    if (!superficieNormalized.trim() || Number.isNaN(Number(superficieNormalized))) {
      next.superficieHa = 'Indiquez une superficie valide.';
    }
    if (presenceOmbrageChoice == null) {
      next.presenceOmbrage = 'Sélectionnez une réponse.';
    }
    if (moyenTransportChoice == null) {
      next.moyenTransport = 'Sélectionnez une réponse.';
    }
    setErrors(next);
    const keys = Object.keys(next) as (keyof FieldErrors)[];
    return { ok: keys.length === 0, firstKey: keys[0] };
  }, [
    nomParcelle,
    superficieNormalized,
    presenceOmbrageChoice,
    moyenTransportChoice,
  ]);

  const scrollToField = (key: string) => {
    const node = fieldRefs.current[key];
    if (!node) return;
    node.measureInWindow((_x, y) => {
      // Approximate scroll offset from window Y (header ~56 + progress ~60)
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    });
  };

  const handleNext = async () => {
    setAttemptedNext(true);
    const { ok, firstKey } = validateStep();
    if (!ok) {
      haptics.notificationError();
      if (firstKey) scrollToField(firstKey);
      return;
    }
    haptics.notificationSuccess();
    await persistDraft();
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else router.push('/(protected)/s21-sommaire');
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveAndExit = async () => {
    haptics.selection();
    const ok = await persistDraft();
    if (!ok) return;
    router.push('/(protected)/s21-sommaire');
  };

  if (isConsentRefused) {
    return (
      <AppScreen padding={0} backgroundColor={colors.fond}>
        <FormSurveyHeader title="Fin de l'enquête" />
        <View style={styles.refusalContainer}>
          <SemanticIcon name="handshake" size={48} color={colors.vert} />
          <Text style={styles.refusalTitle}>Refus de consentement pris en compte</Text>
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxLabel}>Statut du dossier</Text>
            <StatusChip status="incomplet" label="NON_EVALUE" />
            <Text style={styles.statusBoxMessage}>
              Aucun risque n'a été préjugé. Le dossier est classé comme NON_EVALUE conformément
              aux exigences éthiques et réglementaires CLMRS.
            </Text>
          </View>
          <SensitiveContentNotice
            type="rgpd"
            title="Confidentialité et dignité"
            message="Le refus de participer est un droit du producteur. Aucune pénalité n'est appliquée."
          />
          <PrimaryButton
            title="Retour au sommaire"
            icon="check-circle-outline"
            onPress={() => router.push('/(protected)/s21-sommaire')}
            style={styles.actionBtn}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen padding={0} backgroundColor={colors.fond} style={styles.screen}>
      <FormSurveyHeader title="Plantation" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <KeyboardAwareScrollView
          ref={scrollRef}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormProgressBar
            sectionLabel="Section C"
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
          <LocalSaveIndicator
            state={saveState}
            timeLabel={saveState === 'saved' ? savedAt : undefined}
          />

          <Text style={styles.requiredLegend}>* Champs obligatoires</Text>

          <View
            ref={(r) => {
              fieldRefs.current.nomParcelle = r;
            }}
            collapsable={false}
          >
            <QuestionCard
              questionNumber="Q22.C1"
              title="Identification de la parcelle"
              required
              status={
                attemptedNext && (errors.nomParcelle || errors.superficieHa)
                  ? 'error'
                  : 'pending'
              }
            >
              <FormTextField
                label="Nom ou code de la parcelle"
                value={nomParcelle}
                onChangeText={(t) => {
                  setNomParcelle(t);
                  if (errors.nomParcelle) setErrors((e) => ({ ...e, nomParcelle: undefined }));
                }}
                placeholder="ex. Parcelle P-001 Soubré"
                required
                error={attemptedNext ? errors.nomParcelle : undefined}
              />

              <View
                ref={(r) => {
                  fieldRefs.current.superficieHa = r;
                }}
                collapsable={false}
              >
                <FormUnitField
                  label="Superficie"
                  value={superficieDisplay}
                  unit="ha"
                  required
                  error={attemptedNext ? errors.superficieHa : undefined}
                  onChangeText={(display, normalized) => {
                    setSuperficieDisplay(display);
                    setSuperficieNormalized(normalized);
                    if (errors.superficieHa) {
                      setErrors((e) => ({ ...e, superficieHa: undefined }));
                    }
                  }}
                  placeholder="ex. 3,5"
                />
              </View>

              <FormTextField
                label="Année de plantation"
                value={anneePlantation}
                onChangeText={setAnneePlantation}
                keyboardType="number-pad"
                placeholder="ex. 2018"
              />
            </QuestionCard>
          </View>

          <QuestionCard questionNumber="Q22.C2" title="Pratiques agricoles" required>
            <View
              ref={(r) => {
                fieldRefs.current.presenceOmbrage = r;
              }}
              collapsable={false}
            >
              <ChoiceCard
                label="Présence d'arbres d'ombrage agroforestiers (> 16 arbres/ha) ?"
                selectedValue={presenceOmbrageChoice}
                error={attemptedNext ? errors.presenceOmbrage : undefined}
                onSelect={(val) => {
                  setPresenceOmbrageChoice(val as OptionChoice);
                  if (errors.presenceOmbrage) {
                    setErrors((e) => ({ ...e, presenceOmbrage: undefined }));
                  }
                }}
              />
            </View>

            <View
              ref={(r) => {
                fieldRefs.current.moyenTransport = r;
              }}
              collapsable={false}
            >
              <ChoiceCard
                label="Existence d'un moyen de transport motorisé pour la récolte ?"
                selectedValue={moyenTransportChoice}
                error={attemptedNext ? errors.moyenTransport : undefined}
                onSelect={(val) => {
                  setMoyenTransportChoice(val as OptionChoice);
                  if (errors.moyenTransport) {
                    setErrors((e) => ({ ...e, moyenTransport: undefined }));
                  }
                }}
              />
            </View>
          </QuestionCard>
        </KeyboardAwareScrollView>

        <FormStepNav
          showPrevious={currentStep > 1}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveAndExit={handleSaveAndExit}
          nextLabel={currentStep < totalSteps ? 'Suivant' : 'Finaliser'}
        />
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.xl,
  },
  requiredLegend: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.sm,
  },
  refusalContainer: {
    padding: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: spacing.m,
  },
  refusalTitle: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    width: '100%',
    alignItems: 'center',
  },
  statusBoxLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.xs,
  },
  statusBoxMessage: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    textAlign: 'center',
    marginTop: spacing.s,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.m,
    width: '100%',
  },
});
