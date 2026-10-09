import { Alert } from 'react-native';
import i18n from '../i18n';

/**
 * Shows unsaved-changes dialog. Resolves true if back was handled (stay or leave),
 * and calls onDiscard / onSaveQuit when the user chooses those actions.
 */
export function promptUnsavedExit(opts: {
  isDirty: boolean;
  onDiscard: () => void;
  onSaveQuit?: () => void | Promise<void>;
}): boolean {
  if (!opts.isDirty) return false;

  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive' | 'default';
    onPress?: () => void;
  }[] = [
    { text: i18n.t('nav.unsavedContinue'), style: 'cancel' },
  ];

  if (opts.onSaveQuit) {
    buttons.push({
      text: i18n.t('nav.unsavedSaveQuit'),
      onPress: () => {
        void opts.onSaveQuit?.();
      },
    });
  }

  buttons.push({
    text: i18n.t('nav.unsavedDiscard'),
    style: 'destructive',
    onPress: opts.onDiscard,
  });

  Alert.alert(i18n.t('nav.unsavedTitle'), i18n.t('nav.unsavedBody'), buttons);
  return true;
}
