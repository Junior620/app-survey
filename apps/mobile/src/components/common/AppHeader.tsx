import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, layout } from '../../theme';
import { SemanticIcon } from './icons';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional site/dossier context under the subtitle */
  contextLabel?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightActions?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  contextLabel,
  onBack,
  showBack = true,
  rightActions,
  backgroundColor = colors.fond,
  titleColor = colors.texte,
  style,
  testID,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const canNavigateBack = showBack && (onBack || router.canGoBack());

  return (
    <View
      style={[styles.container, { backgroundColor }, style]}
      testID={testID}
      accessibilityRole="header"
    >
      <View style={styles.leftContainer}>
        {canNavigateBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            accessibilityHint={t('common.back')}
            hitSlop={layout.hitSlop}
          >
            <SemanticIcon name="back" size={layout.iconSizeLg} color={titleColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.titleContainer}>
        <Text
          numberOfLines={2}
          style={[styles.title, { color: titleColor }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {contextLabel ? (
          <Text numberOfLines={1} style={styles.context}>
            {contextLabel}
          </Text>
        ) : null}
        {subtitle ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContainer}>{rightActions}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  leftContainer: {
    width: layout.controlHeight,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  title: {
    ...typography.presets.h3,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  context: {
    ...typography.presets.labelMedium,
    color: colors.vert,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitle: {
    ...typography.presets.meta,
    color: colors.texteSecondaire,
    textAlign: 'center',
    marginTop: 2,
  },
  rightContainer: {
    minWidth: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
