import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { PrimaryButton } from './PrimaryButton';
import { SemanticIcon, type SemanticIconName } from './icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface EmptyStateProps {
  /** MCI source name (legacy) or prefer semanticIcon */
  iconName?: string;
  semanticIcon?: SemanticIconName;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName,
  semanticIcon = 'folder',
  title,
  description,
  actionTitle,
  onAction,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconCircle}>
        {iconName ? (
          <Icon source={iconName} size={28} color={colors.vert} />
        ) : (
          <SemanticIcon name={semanticIcon} size={28} color={colors.vert} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {actionTitle && onAction ? (
        <View style={styles.buttonContainer}>
          <PrimaryButton title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginVertical: spacing.l,
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  title: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.l,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    marginTop: spacing.xs,
  },
});
