import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen } from '../../src/components/common/AppScreen';
import { AppLogo } from '../../src/components/common/AppLogo';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { colors, spacing, typography } from '../../src/theme';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { formatFirstName, formatRoleLabel } from '../../src/utils/roleLabels';

type PrepPhase = 'profile' | 'sites' | 'open' | 'ready' | 'timeout';

function destinationForRole(role: string | null | undefined): string {
  switch (role) {
    case 'AGENT_TERRAIN':
      return '/(protected)/(agent)';
    case 'RESPONSABLE_DURABILITE':
      return '/(protected)/(durabilite)';
    case 'ADMIN':
      return '/(protected)/(admin)';
    case 'AUDITEUR':
      return '/(protected)/(auditeur)';
    default:
      return role ? '/(protected)/(agent)' : '/(protected)/s07-access-denied';
  }
}

export default function S05SessionCheckScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const userRole = useAuthStore((s) => s.userRole);
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);

  const [phase, setPhase] = useState<PrepPhase>('profile');
  const [retryToken, setRetryToken] = useState(0);
  const navigated = useRef(false);

  const navigateAway = useCallback(
    (role: string | null | undefined, st: string) => {
      if (navigated.current) return;
      navigated.current = true;
      if (st === 'forbidden' || !role) {
        router.replace('/(protected)/s07-access-denied');
        return;
      }
      router.replace(destinationForRole(role) as never);
    },
    [router]
  );

  useEffect(() => {
    navigated.current = false;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let openId: ReturnType<typeof setTimeout> | undefined;

    const finish = (role: string | null | undefined, st: string, showGreeting: boolean) => {
      if (cancelled) return;
      if (showGreeting) {
        setPhase('ready');
        openId = setTimeout(() => {
          if (cancelled) return;
          setPhase('open');
          navigateAway(role, st);
        }, 1400);
      } else {
        setPhase('open');
        navigateAway(role, st);
      }
    };

    const st0 = useAuthStore.getState();
    if (st0.status === 'forbidden') {
      navigateAway(null, 'forbidden');
      return;
    }

    if (st0.profile || st0.userRole) {
      finish(st0.userRole || st0.profile?.role, st0.status, true);
      return () => {
        cancelled = true;
        if (openId) clearTimeout(openId);
      };
    }

    setPhase('sites');
    timeoutId = setTimeout(() => {
      if (!cancelled && !navigated.current) setPhase('timeout');
    }, 9000);

    pollId = setInterval(() => {
      const st = useAuthStore.getState();
      if (st.status === 'forbidden') {
        if (pollId) clearInterval(pollId);
        if (timeoutId) clearTimeout(timeoutId);
        navigateAway(null, 'forbidden');
        return;
      }
      if (st.profile || st.userRole) {
        if (pollId) clearInterval(pollId);
        if (timeoutId) clearTimeout(timeoutId);
        finish(st.userRole || st.profile?.role, st.status, true);
      }
    }, 200);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (timeoutId) clearTimeout(timeoutId);
      if (openId) clearTimeout(openId);
    };
  }, [navigateAway, retryToken]);

  const onRetry = async () => {
    setPhase('profile');
    navigated.current = false;
    try {
      await initialize();
    } catch {
      // timeout UI if still stuck
    }
    setRetryToken((token) => token + 1);
  };

  const firstName = formatFirstName(profile?.fullName);
  const roleLabel = formatRoleLabel(userRole || profile?.role);
  const zone = profile?.region?.trim() || null;

  if (phase === 'timeout') {
    return (
      <AppScreen padding="m" backgroundColor={colors.fond}>
        <View style={styles.center}>
          <AppLogo size="md" markOnly />
          <Text style={styles.title}>{t('session.interrupted')}</Text>
          <Text style={styles.subtitle}>{t('session.interruptedBody')}</Text>
          <PrimaryButton
            title={t('common.retry')}
            onPress={onRetry}
            style={{ marginTop: spacing.l }}
          />
        </View>
      </AppScreen>
    );
  }

  const statusText =
    phase === 'open'
      ? t('session.opening')
      : phase === 'sites'
        ? t('session.loadingSites')
        : t('session.loadingProfile');

  return (
    <AppScreen padding="m" backgroundColor={colors.fond}>
      <View style={styles.center}>
        <AppLogo size="lg" markOnly />
        <Text style={styles.title}>{t('session.preparing')}</Text>

        {phase === 'ready' && firstName ? (
          <View style={styles.greeting}>
            <Text style={styles.hello}>{t('session.hello', { name: firstName })}</Text>
            <Text style={styles.meta}>
              {roleLabel}
              {zone ? ` · ${zone}` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.vert} />
            <Text style={styles.status}>{statusText}</Text>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    gap: spacing.m,
  },
  title: {
    ...typography.presets.titleLarge,
    color: colors.texte,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.m,
  },
  subtitle: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  greeting: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  hello: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.texte,
  },
  meta: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
    minHeight: 48,
  },
  status: {
    ...typography.presets.bodyMedium,
    color: colors.texteSecondaire,
  },
});
