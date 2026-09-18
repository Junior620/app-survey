import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SemanticIcon } from './icons';
import { colors, radius, spacing, typography, shadows } from '../../theme';
import { ValidationMessage } from './ValidationMessage';

export interface QuestionCardProps {
  questionNumber?: string;
  title: string;
  subtitle?: string;
  helpText?: string;
  required?: boolean;
  /** When true, show question ID discreetly instead of prominent badge cluster */
  showQuestionId?: boolean;
  status?: 'completed' | 'pending' | 'error';
  errorMessage?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  title,
  subtitle,
  helpText,
  required = false,
  showQuestionId = true,
  status = 'pending',
  errorMessage,
  children,
  style,
  testID,
}) => {
  return (
    <View style={[styles.card, shadows.sm, style]} testID={testID}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {title}
            {required ? <Text style={styles.asterisk}> *</Text> : null}
          </Text>
          {status === 'completed' ? (
            <SemanticIcon name="success" size={18} color={colors.vert} />
          ) : status === 'error' ? (
            <SemanticIcon name="error" size={18} color={colors.erreur} />
          ) : null}
        </View>

        {questionNumber && showQuestionId ? (
          <Text style={styles.metaId}>{questionNumber}</Text>
        ) : null}

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {helpText ? (
          <View style={styles.helpBox}>
            <SemanticIcon name="lightbulb" size={16} color={colors.texteSecondaire} />
            <Text style={styles.helpText}>{helpText}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>{children}</View>

      {errorMessage ? <ValidationMessage message={errorMessage} style={styles.errorWrap} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
    marginBottom: spacing.m,
    width: '100%',
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  title: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    flex: 1,
  },
  asterisk: {
    color: colors.erreur,
  },
  metaId: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
  },
  subtitle: {
    ...typography.presets.bodySmall,
    color: colors.texteSecondaire,
    marginTop: spacing.xxs,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    padding: spacing.s,
    borderRadius: radius.s,
    marginTop: spacing.xs,
  },
  helpText: {
    ...typography.presets.bodySmall,
    color: colors.texte,
    flex: 1,
  },
  content: {
    gap: spacing.xs,
  },
  errorWrap: {
    marginTop: spacing.s,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.erreur,
  },
});
