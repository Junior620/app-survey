import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen, AppHeader, EmptyState, PrimaryButton, SemanticIcon } from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLocaleStore } from '../../src/stores/useLocaleStore';
import { useSmartBack, useSmartNavigation } from '../../src/navigation';
import { hubDef, isSurveyHubId } from '../../src/survey/surveyHubCategories';
import {
  displayQuestionnaireTitle,
  loadProducerSurveys,
  type ProducerSurveyItem,
} from '../../src/survey/loadProducerSurveys';
import { haptics } from '../../src/utils/haptics';
import { isPerCampaignCategory } from '../../src/survey/campaigns';
import {
  consentRowFor,
  listConsentRows,
  type ConsentListRow,
} from '../../src/data/repositories/surveyConsentsRepository';
import { consentListPhase } from '../../src/survey/consentPolicy';

export default function PlanteurCategorieScreen() {
  const { t } = useTranslation();
  const nav = useSmartNavigation();
  const { goBack } = useSmartBack();
  const locale = useLocaleStore((s) => s.displayLocale);
  const { planteurId, siteId, hub, producerName } = useLocalSearchParams<{
    planteurId: string;
    siteId: string;
    hub: string;
    producerName?: string;
  }>();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';
  const hubId = isSurveyHubId(hub || '') ? hub : 'autre';
  const def = hubDef(hubId);

  const [items, setItems] = useState<ProducerSurveyItem[]>([]);
  const [consents, setConsents] = useState<ConsentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!planteurId || !siteId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const [all, consentRows] = await Promise.all([
            loadProducerSurveys(accountId, siteId, planteurId),
            listConsentRows(accountId, planteurId),
          ]);
          if (alive) {
            setItems(all.filter((i) => i.hub === hubId));
            setConsents(consentRows);
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, hubId, planteurId, siteId])
  );

  const phaseOf = (item: ProducerSurveyItem) => {
    const row = consentRowFor(consents, item.questionnaireId);
    return consentListPhase(row?.snapshot ?? null, item.status);
  };

  const actionLabel = (item: ProducerSurveyItem) => {
    const phase = phaseOf(item);
    if (phase === 'done') return t('producerHub.consult');
    if (phase === 'in_progress' || phase === 'consent_pending') return t('producerHub.continue');
    return t('producerHub.start');
  };

  const statusLabel = (item: ProducerSurveyItem) => {
    const phase = phaseOf(item);
    if (phase === 'declined') return t('producerHub.declined');
    if (phase === 'consent_pending') return t('producerHub.consentPending');
    if (phase === 'done') return t('producerHub.done');
    if (phase === 'in_progress') return t('producerHub.inProgress');
    return t('producerHub.todo');
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t(def.titleKey)}
        subtitle={producerName || t(def.descriptionKey)}
        onBack={goBack}
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : items.length === 0 ? (
        <EmptyState
          semanticIcon="questionnaire"
          title={t('producerHub.empty')}
          description={t('producerHub.emptyHint')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {items.some((item) => isPerCampaignCategory(item.category) && !item.campaign) ? (
            <Text style={styles.noCampaign}>{t('producerHub.noActiveCampaign')}</Text>
          ) : null}
          {items.map((item) => {
            const phase = phaseOf(item);
            const declined = phase === 'declined';
            return (
            <View key={item.assignmentId} style={styles.card}>
              <View style={styles.row}>
                <SemanticIcon name="document" size={20} color={colors.vert} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {displayQuestionnaireTitle(item.title, locale === 'en' ? 'en' : 'fr')}
                  </Text>
                  <Text style={declined ? styles.declined : styles.status}>{statusLabel(item)}</Text>
                  {!declined && item.status === 'in_progress' ? (
                    <Text style={styles.meta}>
                      {t('producerHub.stepProgress', { step: item.currentStep })}
                    </Text>
                  ) : null}
                  {item.campaign ? (
                    <Text style={styles.meta}>
                      {t('producerHub.campaign', { campaign: item.campaign })}
                    </Text>
                  ) : null}
                  {item.pendingSync ? (
                    <Text style={styles.sync}>{t('producerHub.pendingSync')}</Text>
                  ) : null}
                </View>
              </View>
              {declined ? null : (
              <PrimaryButton
                title={actionLabel(item)}
                onPress={() => {
                  haptics.selection();
                  void nav.startSurvey({
                    questionnaireId: item.questionnaireId,
                    versionNumber: item.versionNumber,
                    siteId,
                    planteurId,
                    responseId: item.responseId,
                    origin: 'terrain',
                  });
                }}
              />
              )}
              {item.previous.length > 0 ? (
                <View style={styles.previous}>
                  <Text style={styles.meta}>{t('producerHub.previousCampaigns')}</Text>
                  {item.previous.map((old) => (
                    <Pressable
                      key={old.responseId}
                      style={styles.previousRow}
                      accessibilityRole="button"
                      accessibilityLabel={t('producerHub.consultCampaign', {
                        campaign: old.campaignName ?? t('producerHub.noCampaign'),
                      })}
                      onPress={() => {
                        haptics.selection();
                        void nav.startSurvey({
                          questionnaireId: item.questionnaireId,
                          versionNumber: old.versionNumber,
                          siteId,
                          planteurId,
                          responseId: old.responseId,
                          origin: 'terrain',
                        });
                      }}
                    >
                      <SemanticIcon name="view" size={18} color={colors.vert} />
                      <Text style={styles.previousLabel}>
                        {t('producerHub.consultCampaign', {
                          campaign: old.campaignName ?? t('producerHub.noCampaign'),
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            );
          })}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.m, paddingBottom: spacing.xxl, gap: spacing.s },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.s,
  },
  row: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  title: { ...typography.presets.titleMedium, color: colors.texte, fontFamily: typography.fontFamily.bold },
  status: { ...typography.presets.labelSmall, color: colors.vert, marginTop: 4, fontFamily: typography.fontFamily.bold },
  declined: { ...typography.presets.labelSmall, color: colors.erreur, marginTop: 4, fontFamily: typography.fontFamily.bold },
  meta: { ...typography.presets.meta, color: colors.texteSecondaire, marginTop: 2 },
  sync: { ...typography.presets.labelSmall, color: colors.attentionFonce, marginTop: 4 },
  noCampaign: {
    ...typography.presets.bodySmall,
    color: colors.attentionFonce,
    backgroundColor: colors.ambreClair,
    padding: spacing.s,
    borderRadius: radius.s,
  },
  previous: { borderTopWidth: 1, borderTopColor: colors.bordure, paddingTop: spacing.s, gap: spacing.xs },
  previousRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, minHeight: 44 },
  previousLabel: { ...typography.presets.bodyMedium, color: colors.vert },
});
