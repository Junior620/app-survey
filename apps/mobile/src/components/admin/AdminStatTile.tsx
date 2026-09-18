import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { SemanticIcon, type SemanticIconName } from '../common';
import { colors, spacing, typography, shadows } from '../../theme';
import { haptics } from '../../utils/haptics';

export type StatValue =
  | { kind: 'number'; value: number }
  | { kind: 'unavailable' }
  | { kind: 'loading' };

export type AdminStatTileProps = {
  icon: SemanticIconName;
  label: string;
  value: StatValue;
  onPress?: () => void;
  accessibilityHint?: string;
};

export function AdminStatTile({
  icon,
  label,
  value,
  onPress,
  accessibilityHint,
}: AdminStatTileProps) {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const singleCol = width < 360 || fontScale > 1.2;

  const display =
    value.kind === 'loading'
      ? null
      : value.kind === 'unavailable'
        ? 'Non disponible'
        : String(value.value);

  const body = (
    <View style={[styles.tile, singleCol && styles.tileFull]}>
      <View style={styles.iconWrap}>
        <SemanticIcon name={icon} size={22} color={colors.vert} />
      </View>
      {value.kind === 'loading' ? (
        <ActivityIndicator color={colors.vert} style={{ marginVertical: spacing.xs }} />
      ) : (
        <Text
          style={[styles.value, value.kind === 'unavailable' && styles.valueMuted]}
          numberOfLines={2}
          accessibilityRole="text"
        >
          {display}
        </Text>
      )}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );

  if (!onPress || value.kind === 'unavailable' || value.kind === 'loading') {
    return (
      <View style={[styles.wrap, singleCol && styles.wrapFull]} accessibilityRole="summary">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.wrap, singleCol && styles.wrapFull]}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${display}`}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </Pressable>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const singleCol = width < 360 || fontScale > 1.2;
  return <View style={[styles.grid, singleCol && styles.gridCol]}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  gridCol: {
    flexDirection: 'column',
  },
  wrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
  },
  wrapFull: {
    width: '100%',
  },
  tile: {
    backgroundColor: colors.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    minHeight: 112,
    ...shadows.sm,
  },
  tileFull: {
    width: '100%',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.vertClair,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  value: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '800',
    marginBottom: 4,
  },
  valueMuted: {
    ...typography.presets.bodySmall,
    fontWeight: '600',
    color: colors.texteSecondaire,
  },
  label: {
    ...typography.presets.labelMedium,
    color: colors.texteSecondaire,
  },
});
