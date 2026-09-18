import type { AppRole } from '@appsurvey/shared';
import { roleHasPermission } from '@appsurvey/shared';

export function assertQuestionnaireAdmin(role: AppRole | null | undefined): void {
  if (!role || !roleHasPermission(role, 'questionnaire.admin')) {
    throw new Error('Accès réservé aux administrateurs.');
  }
}

export function canManageQuestionnaires(role: AppRole | null | undefined): boolean {
  return !!role && roleHasPermission(role, 'questionnaire.admin');
}
