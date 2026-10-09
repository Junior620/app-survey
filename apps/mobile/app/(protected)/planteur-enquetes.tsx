import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen, AppHeader, PrimaryButton, SemanticIcon } from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getPlanteurById } from '../../src/data';
import { listConsentRows, type ConsentListRow } from '../../src/data/repositories/surveyConsentsRepository';
import { consentListPhase } from '../../src/survey/consentPolicy';
import { useSmartBack, useSmartNavigation } from '../../src/navigation';
import { SURVEY_HUBS, hubDef, type SurveyHubId } from '../../src/survey/surveyHubCategories';
import {
  loadProducerSurveys,
  summarizeHub,
  type ProducerSurveyItem,
} from '../../src/survey/loadProducerSurveys';
import { haptics } from '../../src/utils/haptics';

function statusLabel(
  t: (k: string, o?: Record<string, unknown>) => string,
  status: 'todo' | 'in_progress' | 'done'
) {
  if (status === 'done') return t('producerHub.done');
  if (status === 'in_progress') return t('producerHub.inProgress');
  return t('producerHub.todo');
}

export default function PlanteurEnquetesScreen() {
  const { t } = useTranslation();
  const nav = useSmartNavigation();
  const { goBack } = useSmartBack();
  const { planteurId, siteId: siteParam } = useLocalSearchParams<{
    planteurId: string;
    siteId?: string;
  }>();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState(siteParam || '');
  const [items, setItems] = useState<ProducerSurveyItem[]>([]);
  const [consents, setConsents] = useState<ConsentListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!planteurId) return;
        setLoading(true);
        try {
          const p = await getPlanteurById(accountId, planteurId);
          const sid = siteParam || p?.siteId || '';
          if (!alive) return;
          setName(p ? `${p.prenoms} ${p.nom}`.trim() || p.code : '');
          setSiteId(sid);
          if (sid) {
            const [surveys, consentRows] = await Promise.all([
              loadProducerSurveys(accountId, sid, planteurId),
              listConsentRows(accountId, planteurId),
            ]);
            if (alive) {
              setItems(surveys);
              setConsents(consentRows);
            }
          } else if (alive) {
            setItems([]);
            setConsents([]);
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, planteurId, siteParam])
  );

  const hubs: SurveyHubId[] = [
    ...SURVEY_HUBS.map((h) => h.id),
    ...(items.some((i) => i.hub === 'autre') ? (['autre'] as const) : []),
  ];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('producerHub.surveys')}
        subtitle={name || t('producerHub.surveysSubtitle')}
        onBack={goBack}
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.caption}>
            {t('producerHub.categoriesCount', { count: hubs.length })}
          </Text>
          {items.length === 0 ? (
            <Text style={styles.emptyHint}>{t('producerHub.emptyHint')}</Text>
          ) : null}
          {hubs.map((id) => {
            const def = hubDef(id);
            const group = items.filter((i) => i.hub === id);
            if (group.length === 0 && id === 'autre') return null;
            const summary = summarizeHub(group);
            const only = group.length === 1 ? group[0] : null;
            const phase = only
              ? consentListPhase(
                  consents.find((c) => c.questionnaireId === only.questionnaireId)?.snapshot ?? null,
                  only.status
                )
              : null;
            const actionTitle =
              phase === 'declined'
                ? t('producerHub.declined')
                : !only
                  ? group.length === 0
                    ? t('producerHub.start')
                    : t('producerHub.open')
                  : phase === 'done'
                    ? t('producerHub.consult')
                    : phase === 'in_progress' || phase === 'consent_pending'
                      ? t('producerHub.continue')
                      : t('producerHub.start');
            const openCategory = () => {
              if (!planteurId || !siteId) return;
              haptics.selection();
              void nav.openSurveyCategory({
                planteurId,
                siteId,
                hub: id,
                producerName: name,
              });
            };
            return (
              <View key={id} style={styles.card}>
                <Pressable
                  style={styles.cardRow}
                  accessibilityRole="button"
                  accessibilityLabel={t(def.titleKey)}
                  onPress={openCategory}
                >
                  <SemanticIcon name={def.icon} size={22} color={colors.vert} />
                  <View style={styles.cardText}>
                    <Text style={styles.title}>{t(def.titleKey)}</Text>
                    <Text style={styles.desc}>{t(def.descriptionKey)}</Text>
                    <Text style={styles.meta}>
                      {t('producerHub.questionnaires', { count: summary.total })}
                      {' · '}
                      {t('producerHub.doneCount', { done: summary.done })}
                      {summary.inProgress
                        ? ` · ${t('producerHub.inProgressCount', { count: summary.inProgress })}`
                        : ''}
                    </Text>
                    <Text style={phase === 'declined' ? styles.declined : styles.status}>
                      {phase === 'declined'
                        ? t('producerHub.declined')
                        : phase === 'consent_pending'
                          ? t('producerHub.consentPending')
                          : phase === 'done'
                            ? t('producerHub.done')
                            : phase === 'in_progress'
                              ? t('producerHub.inProgress')
                              : statusLabel(t, summary.status)}
                    </Text>
                  </View>
                  <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                </Pressable>
                {phase === 'declined' ? null : (
                <PrimaryButton
                  title={actionTitle}
                  disabled={group.length === 0 || !planteurId || !siteId}
                  onPress={() => {
                    if (!only || !planteurId || !siteId) {
                      openCategory();
                      return;
                    }
                    haptics.selection();
                    void nav.startSurvey({
                      questionnaireId: only.questionnaireId,
                      versionNumber: only.versionNumber,
                      siteId,
                      planteurId,
                      responseId: only.responseId,
                      origin: 'terrain',
                    });
                  }}
                  />
                )}
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
  caption: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.s,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    minHeight: 72,
  },
  cardText: { flex: 1, minWidth: 0 },
  title: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  desc: { ...typography.presets.bodySmall, color: colors.texteSecondaire, marginTop: 4 },
  meta: { ...typography.presets.meta, color: colors.texte, marginTop: spacing.s },
  status: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    marginTop: 4,
    fontWeight: '700',
  },
  declined: {
    ...typography.presets.labelSmall,
    color: colors.erreur,
    marginTop: 4,
    fontWeight: '700',
  },
});
