import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../src/theme';

/** Redirect legacy route to planteur-form (create). */
export default function NouveauPlanteurRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ siteId?: string }>();

  useEffect(() => {
    router.replace({
      pathname: '/(protected)/planteur-form',
      params: params.siteId ? { siteId: params.siteId } : {},
    } as never);
  }, [params.siteId, router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.vert} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fond },
});
