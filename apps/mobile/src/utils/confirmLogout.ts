import { Alert } from 'react-native';
import i18n from '../i18n';
import { countPendingOutbox } from '../data/repositories/outboxRepository';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Asks before signing out, and warns when entries are still waiting to be sent:
 * an agent who signs out offline may not be able to sign back in until they have network.
 */
export async function confirmLogout(): Promise<boolean> {
  const accountId = useAuthStore.getState().user?.id;
  let pending = 0;
  if (accountId) {
    try {
      pending = await countPendingOutbox(accountId);
    } catch {
      pending = 0;
    }
  }
  const message =
    pending > 0
      ? i18n.t('common.logoutPendingBody', { count: pending })
      : i18n.t('common.logoutBody');
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('common.logoutTitle'),
      message,
      [
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: i18n.t('common.logout'),
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
