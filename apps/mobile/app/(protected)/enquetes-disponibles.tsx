import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AppScreen,
  AppHeader,
  EmptyState,
  ErrorState,
  PrimaryButton,
  SemanticIcon,
  SensitiveContentNotice,
} from '../../src/components/common';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLocaleStore } from '../../src/stores/useLocaleStore';
import { useSiteContext } from '../../src/stores/useSiteContext';
import { listPlanteursForSite, type PlanteurListItem } from '../../src/data';
import { roleHasPermission } from '@appsurvey/shared';
import { useSmartBack, useSmartNavigation } from '../../src/navigation';
import { SURVEY_HUBS, hubDef, type SurveyHubId } from '../../src/survey/surveyHubCategories';
import {
  displayQuestionnaireTitle,
  loadProducerSurveys,
  loadSiteSurveyCatalog,
  summarizeHub,
  type ProducerSurveyItem,
} from '../../src/survey/loadProducerSurveys';
import { haptics } from '../../src/utils/haptics';

type PendingSurvey = {
  questionnaireId: string;
  versionNumber: string;
  title: string;
};

function farmerLabel(item: Pick<PlanteurListItem, 'prenoms' | 'nom' | 'code'>) {
  return `${item.prenoms ?? ''} ${item.nom ?? ''}`.trim().replace(/\s+/g, ' ') || item.code;
}

export default function EnquetesDisponiblesScreen() {
  const { t } = useTranslation();
  const nav = useSmartNavigation();
  const locale = useLocaleStore((s) => s.displayLocale);
  const params = useLocalSearchParams<{ siteId?: string }>();
  const { user, profile, userRole } = useAuthStore();
  const currentSiteId = useSiteContext((s) => s.currentSiteId);
  const accountId = user?.id || profile?.id || 'local-account';
  const siteId = params.siteId || currentSiteId;

  const [items, setItems] = useState<ProducerSurveyItem[]>([]);
  const [hub, setHub] = useState<SurveyHubId | null>(null);
  const [pending, setPending] = useState<PendingSurvey | null>(null);
  const [farmers, setFarmers] = useState<PlanteurListItem[]>([]);
  const [farmerQuery, setFarmerQuery] = useState('');
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWrite = userRole && roleHasPermission(userRole, 'survey.write');

  const { goBack } = useSmartBack({
    onBeforeBack: () => {
      if (pending) {
        setPending(null);
        return true;
      }
      if (hub) {
        setHub(null);
        return true;
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!siteId) {
          setLoading(false);
          setError(t('surveys.noSite'));
          return;
        }
        if (!canWrite) {
          setLoading(false);
          setError(t('surveys.noWrite'));
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const list = await loadSiteSurveyCatalog(accountId, siteId);
          if (alive) setItems(list);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : t('surveys.loadError'));
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [accountId, canWrite, siteId, t])
  );

  useEffect(() => {
    if (!pending || !siteId) return;
    let alive = true;
    setFarmersLoading(true);
    void listPlanteursForSite(accountId, siteId, farmerQuery)
      .then((rows) => {
        if (alive) setFarmers(rows);
      })
      .finally(() => {
        if (alive) setFarmersLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [accountId, farmerQuery, pending, siteId]);

  const askFarmer = (item: ProducerSurveyItem) => {
    if (!siteId) return;
    haptics.selection();
    setFarmerQuery('');
    setPending({
      questionnaireId: item.questionnaireId,
      versionNumber: item.versionNumber,
      title: displayQuestionnaireTitle(item.title, locale === 'en' ? 'en' : 'fr'),
    });
  };

  const chooseFarmer = async (planteur: PlanteurListItem) => {
    if (!siteId || !pending || startingId) return;
    setStartingId(planteur.id);
    try {
      const surveys = await loadProducerSurveys(accountId, siteId, planteur.id);
      const match = surveys.find((row) => row.questionnaireId === pending.questionnaireId);
      await nav.startSurvey({
        questionnaireId: pending.questionnaireId,
        versionNumber: match?.versionNumber ?? pending.versionNumber,
        siteId,
        planteurId: planteur.id,
        responseId: match?.responseId ?? null,
        origin: 'activities',
      });
      setPending(null);
    } finally {
      setStartingId(null);
    }
  };

  const hubs: SurveyHubId[] = [
    ...SURVEY_HUBS.map((h) => h.id),
    ...(items.some((i) => i.hub === 'autre') ? (['autre'] as const) : []),
  ];
  const def = hub ? hubDef(hub) : null;
  const group = hub ? items.filter((i) => i.hub === hub) : [];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={pending ? t('surveys.chooseFarmer') : def ? t(def.titleKey) : t('surveys.title')}
        subtitle={
          pending
            ? pending.title
            : def
              ? t(def.descriptionKey)
              : t('producerHub.surveysSubtitle')
        }
        onBack={goBack}
      />
      {loading ? (
        <ActivityIndicator color={colors.vert} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <ErrorState title={t('surveys.unavailable')} message={error} />
      ) : pending ? (
        <View style={styles.picker}>
          <Text style={styles.pickerHint}>{t('surveys.chooseFarmerHint')}</Text>
          <View style={styles.search}>
            <SemanticIcon name="search" size={18} color={colors.texteSecondaire} />
            <TextInput
              style={styles.input}
              value={farmerQuery}
              onChangeText={setFarmerQuery}
              placeholder={t('farmers.searchPlaceholder')}
              placeholderTextColor={colors.horsLigne}
              autoCorrect={false}
            />
          </View>
          {farmersLoading ? (
            <ActivityIndicator color={colors.vert} />
          ) : farmers.length === 0 ? (
            <EmptyState
              semanticIcon="producer"
              title={t('farmers.emptyTitle')}
              description={t('farmers.emptyDescription')}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              {farmers.map((farmer) => (
                <Pressable
                  key={farmer.id}
                  style={styles.farmerCard}
                  disabled={!!startingId}
                  accessibilityRole="button"
                  accessibilityLabel={farmerLabel(farmer)}
                  onPress={() => {
                    haptics.selection();
                    void chooseFarmer(farmer);
                  }}
                >
                  <SemanticIcon name="producer" size={20} color={colors.vert} />
                  <View style={styles.cardText}>
                    <Text style={styles.title}>{farmerLabel(farmer)}</Text>
                    <Text style={styles.meta}>
                      {farmer.code}
                      {farmer.telephone ? ` · ${farmer.telephone}` : ''}
                    </Text>
                  </View>
                  {startingId === farmer.id ? (
                    <ActivityIndicator color={colors.vert} />
                  ) : (
                    <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : hub && def ? (
        group.length === 0 ? (
          <EmptyState
            semanticIcon="questionnaire"
            title={t('producerHub.empty')}
            description={t('producerHub.emptyHint')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {group.map((item) => (
              <View key={item.assignmentId} style={styles.listCard}>
                <Text style={styles.title}>
                  {displayQuestionnaireTitle(item.title, locale === 'en' ? 'en' : 'fr')}
                </Text>
                {item.campaign ? (
                  <Text style={styles.meta}>{t('producerHub.campaign', { campaign: item.campaign })}</Text>
                ) : null}
                <PrimaryButton
                  title={t('surveys.chooseFarmer')}
                  onPress={() => askFarmer(item)}
                />
              </View>
            ))}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <SensitiveContentNotice
            type="rgpd"
            title={t('surveys.localTitle')}
            message={t('surveys.localMessage')}
          />
          <Text style={styles.caption}>{t('producerHub.categoriesCount', { count: hubs.length })}</Text>
          {items.length === 0 ? <Text style={styles.emptyHint}>{t('producerHub.emptyHint')}</Text> : null}
          {hubs.map((id) => {
            const card = hubDef(id);
            const cardItems = items.filter((i) => i.hub === id);
            if (cardItems.length === 0 && id === 'autre') return null;
            const summary = summarizeHub(cardItems);
            const only = cardItems.length === 1 ? cardItems[0] : null;
            const actionTitle = only
              ? t('surveys.chooseFarmer')
              : cardItems.length === 0
                ? t('producerHub.start')
                : t('producerHub.open');
            return (
              <View key={id} style={styles.card}>
                <Pressable
                  style={styles.cardRow}
                  accessibilityRole="button"
                  accessibilityLabel={t(card.titleKey)}
                  onPress={() => {
                    if (only && siteId) {
                      askFarmer(only);
                      return;
                    }
                    haptics.selection();
                    setHub(id);
                  }}
                >
                  <SemanticIcon name={card.icon} size={22} color={colors.vert} />
                  <View style={styles.cardText}>
                    <Text style={styles.title}>{t(card.titleKey)}</Text>
                    <Text style={styles.desc}>{t(card.descriptionKey)}</Text>
                    <Text style={styles.meta}>
                      {t('producerHub.questionnaires', { count: summary.total })}
                    </Text>
                  </View>
                  <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
                </Pressable>
                <PrimaryButton
                  title={actionTitle}
                  disabled={cardItems.length === 0}
                  onPress={() => {
                    if (!only || !siteId) {
                      haptics.selection();
                      setHub(id);
                      return;
                    }
                    askFarmer(only);
                  }}
                />
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
  listCard: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    gap: spacing.s,
  },
  title: { ...typography.presets.titleMedium, color: colors.texte, fontWeight: '700' },
  desc: { ...typography.presets.bodySmall, color: colors.texteSecondaire, marginTop: 4 },
  meta: { ...typography.presets.meta, color: colors.texte, marginTop: spacing.s },
  picker: { flex: 1, paddingTop: spacing.m },
  pickerHint: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    backgroundColor: colors.blanc,
    paddingHorizontal: spacing.s,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.presets.bodyMedium,
    color: colors.texte,
    paddingVertical: spacing.s,
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    minHeight: 64,
  },
});
