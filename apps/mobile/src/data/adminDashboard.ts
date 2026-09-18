import type { QuestionnaireListItem, SiteListItem } from '@appsurvey/shared';
import { isRealSupabaseClient } from '@appsurvey/shared';
import { listSitesForAccount } from './repositories/sitesRepository';
import { listQuestionnaires } from './repositories/questionnairesRepository';
import { countPendingOutbox, listPendingOutbox } from './repositories/outboxRepository';
import { getDatabase } from './db';
import { isSupabaseConfigured } from '../services/supabaseConfig';
import { supabaseClient } from '../services/authService';

export type KpiResult = { value: number } | { unavailable: true };

export type AdminTodoItem = {
  id: string;
  kind: 'draft' | 'unpublished_assign' | 'outbox_error' | 'outbox_pending';
  problem: string;
  actionLabel: string;
  questionnaireId?: string;
  tone: 'neutral' | 'attention';
};

export type AdminDashboardData = {
  sites: SiteListItem[];
  sitesActive: KpiResult;
  agentsActive: KpiResult;
  questionnairesPublished: KpiResult;
  outboxPending: KpiResult | null;
  recentQuestionnaires: QuestionnaireListItem[];
  todos: AdminTodoItem[];
  outboxErrorCount: number;
};

async function countActiveAgents(): Promise<KpiResult> {
  if (!isSupabaseConfigured() || !isRealSupabaseClient(supabaseClient)) {
    return { unavailable: true };
  }
  try {
    const { count, error } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'AGENT_TERRAIN');
    if (error || count == null) {
      return { unavailable: true };
    }
    return { value: count };
  } catch {
    return { unavailable: true };
  }
}

export async function loadAdminDashboard(
  accountId: string,
  siteId: string | null
): Promise<AdminDashboardData> {
  const [allSites, questionnaires, pendingCount, pendingItems, agentsActive] = await Promise.all([
    listSitesForAccount(accountId),
    listQuestionnaires(accountId, siteId ? { siteId } : undefined),
    countPendingOutbox(accountId),
    listPendingOutbox(accountId),
    countActiveAgents(),
  ]);

  const sites = siteId ? allSites.filter((s) => s.id === siteId) : allSites;
  const sitesActive: KpiResult = { value: sites.length };

  const published = questionnaires.filter((q) => q.status === 'published');
  const questionnairesPublished: KpiResult = { value: published.length };

  const outboxPending: KpiResult | null =
    pendingCount > 0 || pendingItems.some((i) => !!i.lastError)
      ? { value: pendingCount }
      : pendingCount === 0
        ? { value: 0 }
        : null;

  const errorItems = pendingItems.filter((i) => !!i.lastError);
  const outboxErrorCount = errorItems.length;

  const recentQuestionnaires = [...questionnaires]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5);

  const todos: AdminTodoItem[] = [];

  for (const q of questionnaires.filter((x) => x.status === 'draft' || x.hasDraft)) {
    todos.push({
      id: `draft-${q.id}`,
      kind: 'draft',
      problem: `Brouillon : ${q.title}`,
      actionLabel: 'Continuer',
      questionnaireId: q.id,
      tone: 'neutral',
    });
  }

  for (const q of published) {
    const noSites =
      !q.siteScopeLabel ||
      q.siteScopeLabel === 'Non diffusé' ||
      q.siteScopeLabel.trim() === '';
    if (noSites) {
      todos.push({
        id: `assign-${q.id}`,
        kind: 'unpublished_assign',
        problem: `Publié sans site : ${q.title}`,
        actionLabel: 'Assigner',
        questionnaireId: q.id,
        tone: 'attention',
      });
    }
  }

  if (outboxErrorCount > 0) {
    todos.push({
      id: 'outbox-errors',
      kind: 'outbox_error',
      problem: `${outboxErrorCount} élément${outboxErrorCount > 1 ? 's' : ''} en erreur dans la file`,
      actionLabel: 'Voir la file',
      tone: 'attention',
    });
  } else if (pendingCount > 0) {
    todos.push({
      id: 'outbox-pending',
      kind: 'outbox_pending',
      problem: `${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente de sync`,
      actionLabel: 'Voir la file',
      tone: 'neutral',
    });
  }

  return {
    sites: allSites,
    sitesActive,
    agentsActive,
    questionnairesPublished,
    outboxPending,
    recentQuestionnaires,
    todos: todos.slice(0, 8),
    outboxErrorCount,
  };
}

/** Probe local SQLite without mutating data. */
export async function probeLocalDatabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    const db = await getDatabase();
    await db.getFirstAsync<{ v: number }>('SELECT 1 as v');
    return { ok: true, detail: 'Base locale ouverte' };
  } catch (e: unknown) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : 'Impossible d’ouvrir la base locale',
    };
  }
}
