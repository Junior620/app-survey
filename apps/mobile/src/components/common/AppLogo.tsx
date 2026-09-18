import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../theme';

/** Transparent mark — no black plate behind the artwork. */
const LOGO = require('../../../assets/branding/scpb-icon.png');

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
  const s = SIZE[size];
  const showText = !markOnly;

  return (
    <View
      style={[styles.container, markOnly && styles.containerCentered, style]}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="SCPB Survey — Collecte et traçabilité du cacao"
    >
      <Image
        source={LOGO}
        style={{
          width: s.mark,
          height: s.mark,
          marginRight: showText ? spacing.s : 0,
        }}
        resizeMode="contain"
      />

      {showText ? (
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.brandPrefix, { fontSize: s.title }]}>SCPB</Text>
            <Text style={[styles.brandSuffix, { fontSize: s.title }]}> SURVEY</Text>
          </View>
          {showSubtitle ? (
            <Text style={[styles.subtitle, { fontSize: s.subtitle }]}>
              Collecte et traçabilité du cacao
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
    fontWeight: '800',
    color: colors.vert,
    letterSpacing: 0.5,
  },
  brandSuffix: {
    fontWeight: '800',
    color: colors.brun,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.texteSecondaire,
    fontWeight: '500',
    marginTop: 2,
  },
});
