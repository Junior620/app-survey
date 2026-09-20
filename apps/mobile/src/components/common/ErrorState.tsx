import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from './PrimaryButton';
import { SemanticIcon } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryTitle?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryTitle,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.systemError');
  const resolvedRetry = retryTitle ?? t('common.retry');

  return (
    <View style={[styles.container, style]} testID={testID} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <SemanticIcon name="warning" size={28} color={colors.erreur} />
      </View>

      <Text style={styles.title}>{resolvedTitle}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry ? (
        <View style={styles.buttonContainer}>
          <PrimaryButton title={resolvedRetry} onPress={onRetry} icon="refresh" />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.m,
    borderWidth: 1.5,
    borderColor: colors.erreur,
    padding: spacing.l,
    alignItems: 'center',
    marginVertical: spacing.m,
    width: '100%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.blanc,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  title: {
    ...typography.presets.titleMedium,
    color: colors.critique,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.presets.bodyMedium,
    color: colors.texte,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.m,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 240,
  },
});
