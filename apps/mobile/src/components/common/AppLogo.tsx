import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '../../theme';

/** Transparent mark (3:2), no plate behind the artwork. */
const LOGO = require('../../../assets/branding/scpb-logo-transparent.png');
const LOGO_RATIO = 1024 / 681;

export interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  markOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SIZE = {
  sm: { mark: 48, title: 15, subtitle: 10 },
  md: { mark: 72, title: 20, subtitle: 12 },
  lg: { mark: 148, title: 26, subtitle: 13 },
} as const;

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  markOnly = false,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const s = SIZE[size];
  const showText = !markOnly;
  const tagline = t('common.brandTagline');

  return (
    <View
      style={[styles.container, markOnly && styles.containerCentered, style]}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={`${t('common.brand')} — ${tagline}`}
    >
      <Image
        source={LOGO}
        style={{
          width: Math.round(s.mark * LOGO_RATIO),
          height: s.mark,
          marginRight: showText ? spacing.s : 0,
        }}
        resizeMode="contain"
      />

      {showText ? (
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.brandPrefix, { fontSize: s.title }]}>SCPB</Text>
            <Text style={[styles.brandSuffix, { fontSize: s.title }]}> Survey</Text>
          </View>
          {showSubtitle ? (
            <Text style={[styles.subtitle, { fontSize: s.subtitle }]}>
              {tagline}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerCentered: {
    justifyContent: 'center',
  },
  textContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  brandPrefix: {
    fontFamily: typography.fontFamily.bold,
    color: colors.vert,
    letterSpacing: 0.5,
  },
  brandSuffix: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.brun,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.texteSecondaire,
    marginTop: 2,
  },
});
