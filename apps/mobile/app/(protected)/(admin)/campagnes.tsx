import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  FormTextField,
  KeyboardAwareScrollView,
  PrimaryButton,
  SecondaryButton,
} from '../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useSmartBack } from '../../../src/navigation';
import {
  closeCampaign,
  createCampaign,
  listCampaigns,
} from '../../../src/data/repositories/campaignsRepository';
import { requestAutoSync } from '../../../src/data/autoSync';
import { campaignInputError, pickActiveCampaign, type Campaign } from '../../../src/survey/campaigns';
import { haptics } from '../../../src/utils/haptics';

/** Admin: survey campaigns. Household, education and annual surveys restart with each campaign. */
export default function CampaignsScreen() {
  const { t } = useTranslation();
  const { goBack } = useSmartBack();
  const { user, profile } = useAuthStore();
  const accountId = user?.id || profile?.id || 'local-account';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await listCampaigns());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const active = pickActiveCampaign(campaigns);

  const onCreate = async () => {
    const input = { name, startsOn: startsOn.trim(), endsOn: endsOn.trim() };
    const problem = campaignInputError(input);
    setError(problem);
    if (problem || saving) return;
    setSaving(true);
    try {
      await createCampaign(accountId, profile?.cooperativeId ?? null, input);
      haptics.notificationSuccess();
      setName('');
      setStartsOn('');
      setEndsOn('');
      requestAutoSync(accountId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('campaigns.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const onClose = (campaign: Campaign) => {
    Alert.alert(t('campaigns.closeTitle'), t('campaigns.closeBody', { name: campaign.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('campaigns.close'),
        style: 'destructive',
        onPress: async () => {
          await closeCampaign(accountId, campaign.id);
          requestAutoSync(accountId);
          await load();
        },
      },
    ]);
  };

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader title={t('campaigns.title')} subtitle={t('campaigns.subtitle')} onBack={goBack} />
      <KeyboardAwareScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={active ? styles.activeOk : styles.activeNone}>
          {active
            ? t('campaigns.activeNow', { name: active.name, end: active.endsOn })
            : t('campaigns.noneActive')}
        </Text>

        <View style={styles.card}>
          <Text style={styles.section}>{t('campaigns.new')}</Text>
          <FormTextField
            label={t('campaigns.name')}
            value={name}
            onChangeText={setName}
            placeholder="2026-2027"
            required
          />
          <FormTextField
            label={t('campaigns.startsOn')}
            value={startsOn}
            onChangeText={setStartsOn}
            placeholder="2026-10-01"
            keyboardType="numbers-and-punctuation"
            required
          />
          <FormTextField
            label={t('campaigns.endsOn')}
            value={endsOn}
            onChangeText={setEndsOn}
            placeholder="2027-09-30"
            keyboardType="numbers-and-punctuation"
            required
            error={error ?? undefined}
          />
          <Text style={styles.hint}>{t('campaigns.restartHint')}</Text>
          <PrimaryButton title={t('campaigns.create')} onPress={() => void onCreate()} loading={saving} disabled={saving} />
        </View>

        <Text style={styles.section}>{t('campaigns.list')}</Text>
        {loading ? (
          <ActivityIndicator color={colors.vert} />
        ) : campaigns.length === 0 ? (
          <EmptyState semanticIcon="calendar" title={t('campaigns.empty')} description={t('campaigns.emptyHint')} />
        ) : (
          campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.card}>
              <Text style={styles.name}>{campaign.name}</Text>
              <Text style={styles.meta}>
                {t('campaigns.period', { start: campaign.startsOn, end: campaign.endsOn })}
              </Text>
              <Text style={campaign.status === 'active' ? styles.statusOn : styles.statusOff}>
                {campaign.id === active?.id
                  ? t('campaigns.statusCurrent')
                  : campaign.status === 'active'
                    ? t('campaigns.statusActive')
                    : t('campaigns.statusClosed')}
              </Text>
              {campaign.status === 'active' ? (
                <SecondaryButton title={t('campaigns.close')} onPress={() => onClose(campaign)} />
              ) : null}
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
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
  section: { ...typography.presets.titleSmall, color: colors.texte, marginTop: spacing.s },
  name: { ...typography.presets.titleMedium, color: colors.texte },
  meta: { ...typography.presets.bodySmall, color: colors.texteSecondaire },
  hint: { ...typography.presets.bodySmall, color: colors.texteSecondaire },
  statusOn: { ...typography.presets.labelMedium, color: colors.succes },
  statusOff: { ...typography.presets.labelMedium, color: colors.texteSecondaire },
  activeOk: {
    ...typography.presets.bodyMedium,
    color: colors.vertFonce,
    backgroundColor: colors.vertClair,
    padding: spacing.s,
    borderRadius: radius.s,
  },
  activeNone: {
    ...typography.presets.bodyMedium,
    color: colors.attentionFonce,
    backgroundColor: colors.ambreClair,
    padding: spacing.s,
    borderRadius: radius.s,
  },
});
