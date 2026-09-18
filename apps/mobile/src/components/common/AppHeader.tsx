import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius } from '../../theme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
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
  onBack,
  showBack = true,
  rightActions,
  backgroundColor = colors.fond,
  titleColor = colors.texte,
  style,
  testID,
}) => {
  const router = useRouter();

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
        {canNavigateBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            accessibilityHint="Retourne à l'écran précédent"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconButton
              icon="arrow-left"
              iconColor={titleColor}
              size={24}
              style={styles.iconButton}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: titleColor }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightActions}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  leftContainer: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  title: {
    ...typography.presets.titleMedium,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.presets.bodySmall,
    color: colors.horsLigne,
    textAlign: 'center',
    marginTop: -2,
  },
  rightContainer: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
