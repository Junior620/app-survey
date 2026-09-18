import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, spacing, typography } from '../../theme';
import { StatusChip } from '../common/StatusChip';
import { haptics } from '../../utils/haptics';

export interface LotSummaryCardProps {
  codeLot: string;
  coop: string;
  campagne: string;
  statusLabel: string;
  statusType?: 'encours' | 'valide' | 'brouillon';
  poidsNetKg: number;
  nombreSacs: number;
  humiditePercent: number;
  gradeLabel: string;
  style?: StyleProp<ViewStyle>;
}

export const LotSummaryCard: React.FC<LotSummaryCardProps> = ({
  codeLot,
  coop,
  campagne,
  statusLabel,
  statusType = 'encours',
  poidsNetKg,
  nombreSacs,
  humiditePercent,
  gradeLabel,
  style,
}) => {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const stackMetrics = width < 360 || fontScale > 1.15;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    haptics.selection();
    await Clipboard.setStringAsync(codeLot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.idBlock}>
          <View style={styles.idRow}>
            <Icon source="package-variant" size={20} color={colors.vert} />
            <Text style={styles.code} selectable>
              {codeLot}
            </Text>
            <Pressable
              onPress={handleCopy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Copier l'identifiant du lot"
              style={styles.copyBtn}
            >
              <Icon
                source={copied ? 'check' : 'content-copy'}
                size={18}
                color={copied ? colors.vert : colors.texteSecondaire}
              />
            </Pressable>
          </View>
          {copied ? <Text style={styles.copiedHint}>Copié</Text> : null}
          <Text style={styles.meta}>
            {coop} · {campagne}
          </Text>
        </View>
        <StatusChip status={statusType} label={statusLabel} style={styles.chip} />
      </View>

      <View style={[styles.metrics, stackMetrics && styles.metricsStack]}>
        <View style={styles.metric}>
          <Icon source="scale" size={16} color={colors.texteSecondaire} />
          <Text style={styles.metricValue}>
            {poidsNetKg.toLocaleString('fr-FR')} kg
          </Text>
          <Text style={styles.metricLabel}>Poids net</Text>
        </View>
        <View style={styles.metric}>
          <Icon source="bag-personal" size={16} color={colors.texteSecondaire} />
          <Text style={styles.metricValue}>{nombreSacs} sacs</Text>
          <Text style={styles.metricLabel}>Sacs</Text>
        </View>
        <View style={styles.metric}>
          <Icon source="water-outline" size={16} color={colors.texteSecondaire} />
          <Text style={styles.metricValue}>
            {humiditePercent.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
          </Text>
          <Text style={styles.metricLabel}>Humidité</Text>
        </View>
      </View>

      <View style={styles.gradeRow}>
        <Icon source="medal-outline" size={16} color={colors.vert} />
        <Text style={styles.gradeText}>{gradeLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  idBlock: {
    flex: 1,
    minWidth: 0,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  code: {
    ...typography.presets.titleMedium,
    color: colors.vertFonce,
    fontWeight: '700',
    flexShrink: 1,
  },
  copyBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedHint: {
    ...typography.presets.labelSmall,
    color: colors.vert,
    marginTop: 2,
  },
  meta: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
  },
  chip: {
    flexShrink: 0,
  },
  metrics: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.s,
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  metricsStack: {
    flexDirection: 'column',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  metricValue: {
    ...typography.presets.titleSmall,
    color: colors.texte,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.vertClair,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  gradeText: {
    ...typography.presets.labelMedium,
    color: colors.vert,
    fontWeight: '600',
  },
});
