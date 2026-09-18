import { Platform } from 'react-native';

/**
 * Helper sécurisé pour `expo-haptics`
 * Fournit des micro-feedbacks tactiles pour impact, sélection et notifications
 * avec fallback silencieux en cas d'indisponibilité (web, simulateur ou absence de module).
 */

let HapticsModule: any = null;

try {
  // Dynamically require expo-haptics if available
  HapticsModule = require('expo-haptics');
} catch {
  HapticsModule = null;
}

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

/**
 * Déclenche un retour haptique de type impact.
 */
export const impact = async (style: ImpactStyle = 'light'): Promise<void> => {
  if (Platform.OS === 'web' || !HapticsModule) return;
  try {
    let feedbackStyle = HapticsModule.ImpactFeedbackStyle?.Light;
    if (style === 'medium') feedbackStyle = HapticsModule.ImpactFeedbackStyle?.Medium;
    if (style === 'heavy') feedbackStyle = HapticsModule.ImpactFeedbackStyle?.Heavy;

    if (HapticsModule.impactAsync && feedbackStyle !== undefined) {
      await HapticsModule.impactAsync(feedbackStyle);
    }
  } catch {
    // Fallback silencieux
  }
};

/**
 * Déclenche un retour haptique de sélection.
 */
export const selection = async (): Promise<void> => {
  if (Platform.OS === 'web' || !HapticsModule) return;
  try {
    if (HapticsModule.selectionAsync) {
      await HapticsModule.selectionAsync();
    }
  } catch {
    // Fallback silencieux
  }
};

/**
 * Déclenche un retour haptique de notification (succès, avertissement, erreur).
 */
export const notification = async (type: NotificationType = 'success'): Promise<void> => {
  if (Platform.OS === 'web' || !HapticsModule) return;
  try {
    let notificationType = HapticsModule.NotificationFeedbackType?.Success;
    if (type === 'warning') notificationType = HapticsModule.NotificationFeedbackType?.Warning;
    if (type === 'error') notificationType = HapticsModule.NotificationFeedbackType?.Error;

    if (HapticsModule.notificationAsync && notificationType !== undefined) {
      await HapticsModule.notificationAsync(notificationType);
    }
  } catch {
    // Fallback silencieux
  }
};

export const haptics = {
  impactLight: () => impact('light'),
  impactMedium: () => impact('medium'),
  impactHeavy: () => impact('heavy'),
  selection: () => selection(),
  notificationSuccess: () => notification('success'),
  notificationWarning: () => notification('warning'),
  notificationError: () => notification('error'),
};

export default haptics;
