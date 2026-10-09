import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AppScreen,
  AppHeader,
  SemanticIcon,
  type SemanticIconName,
} from '../../../src/components/common';
import { colors, radius, spacing, typography } from '../../../src/theme';
import { useSiteContext } from '../../../src/stores/useSiteContext';
import { useSmartNavigation } from '../../../src/navigation';
import { haptics } from '../../../src/utils/haptics';

type HubLink = {
  id: string;
  titleKey: string;
  icon: SemanticIconName;
  onPress: () => void;
  needsSite?: boolean;
};

export default function ActivitesHubScreen() {
  const { t } = useTranslation();
  const nav = useSmartNavigation();
  const siteId = useSiteContext((s) => s.currentSiteId);

  const links: HubLink[] = [
    {
      id: 'missions',
      titleKey: 'nav.openMissions',
      icon: 'clipboard',
      onPress: () => void nav.openMissions(),
    },
    {
      id: 'formations',
      titleKey: 'nav.openFormations',
      icon: 'school',
      onPress: () => void nav.openFormations(siteId),
      needsSite: true,
    },
    {
      id: 'enquetes',
      titleKey: 'nav.openSurveys',
      icon: 'document',
      onPress: () => void nav.openEnquetes(siteId),
      needsSite: true,
    },
  ];

  return (
    <AppScreen padding={0} backgroundColor={colors.fond}>
      <AppHeader
        title={t('nav.activitiesHubTitle')}
        subtitle={t('nav.activitiesHubSubtitle')}
        showBack={false}
      />
      <View style={styles.body}>
        {!siteId ? <Text style={styles.hint}>{t('nav.needSite')}</Text> : null}
        {links.map((link) => {
          const disabled = !!link.needsSite && !siteId;
          return (
            <Pressable
              key={link.id}
              style={[styles.card, disabled && styles.cardDisabled]}
              disabled={disabled}
              onPress={() => {
                haptics.selection();
                link.onPress();
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              accessibilityLabel={t(link.titleKey)}
            >
              <SemanticIcon
                name={link.icon}
                size={22}
                color={disabled ? colors.texteSecondaire : colors.vert}
              />
              <Text style={[styles.cardTitle, disabled && styles.cardTitleDisabled]}>
                {t(link.titleKey)}
              </Text>
              <SemanticIcon name="next" size={18} color={colors.texteSecondaire} />
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.m, gap: spacing.s },
  hint: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginBottom: spacing.s,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 64,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  cardDisabled: { opacity: 0.55 },
  cardTitle: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    flex: 1,
  },
  cardTitleDisabled: { color: colors.texteSecondaire },
});
