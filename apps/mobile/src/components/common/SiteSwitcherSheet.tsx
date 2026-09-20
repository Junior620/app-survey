import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ListSearchBar } from './ListSearchBar';
import { SemanticIcon } from './icons';
import { colors, radius, spacing, typography } from '../../theme';
import { haptics } from '../../utils/haptics';
import { useReduceMotion } from '../../utils/motionUtils';

export type SiteSwitcherItem = {
  id: string;
  name: string;
  locality: string;
};

export type SiteSwitcherSheetProps = {
  visible: boolean;
  onClose: () => void;
  sites: SiteSwitcherItem[];
  currentSiteId: string;
  onSelect: (siteId: string) => void;
};

const SEARCH_THRESHOLD = 5;

export function SiteSwitcherSheet({
  visible,
  onClose,
  sites,
  currentSiteId,
  onSelect,
}: SiteSwitcherSheetProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [query, setQuery] = useState('');
  const showSearch = sites.length >= SEARCH_THRESHOLD;

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.locality || '').toLowerCase().includes(q)
    );
  }, [sites, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={t('sites.closeSwitcher')}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {t('sites.changeSite')}
          </Text>

          {showSearch ? (
            <ListSearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('sites.searchPlaceholder')}
              accessibilityLabel={t('sites.searchPlaceholder')}
              style={styles.search}
            />
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>{t('sites.noMatch')}</Text>
            }
            renderItem={({ item }) => {
              const selected = item.id === currentSiteId;
              const locality = item.locality?.trim() || '';
              const selectedSuffix = selected ? `, ${t('sites.selected')}` : '';
              return (
                <TouchableOpacity
                  style={[styles.option, selected && styles.optionOn]}
                  onPress={() => {
                    haptics.selection();
                    if (item.id === currentSiteId) {
                      onClose();
                      return;
                    }
                    onSelect(item.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    locality
                      ? `${item.name}, ${locality}${selectedSuffix}`
                      : `${item.name}${selectedSuffix}`
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.optionTextCol}>
                    <Text
                      style={[styles.optionName, selected && styles.optionNameOn]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    {locality ? (
                      <Text style={styles.optionLocality} numberOfLines={1}>
                        {locality}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <SemanticIcon name="check" size={22} color={colors.vert} />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 39, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.blanc,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.s,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bordure,
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  search: {
    marginBottom: spacing.s,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    marginBottom: 4,
  },
  optionOn: {
    backgroundColor: colors.vertClair,
  },
  optionTextCol: {
    flex: 1,
  },
  optionName: {
    ...typography.presets.bodyLarge,
    color: colors.texte,
    fontWeight: '600',
  },
  optionNameOn: {
    color: colors.vertFonce,
    fontWeight: '700',
  },
  optionLocality: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
  empty: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    padding: spacing.s,
    textAlign: 'center',
  },
});
