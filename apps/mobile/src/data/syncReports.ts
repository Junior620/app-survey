import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { isRealSupabaseClient } from '@appsurvey/shared';
import { supabaseClient } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseConfig';
import { countPendingOutbox } from './repositories/outboxRepository';
import { DEFAULT_COOPERATIVE_ID } from './syncConstants';

export type CloudReportKpis = {
  cooperativeId: string;
  sitesActive: number | null;
  agentsCount: number | null;
  surveyResponses: number | null;
  questionnairesPublished: number | null;
  outboxPendingLocal: number;
  unavailableReason?: string;
};

export type CloudReportRow = {
  id: string;
  templateKey: string;
  businessStatus: string;
  updatedAt: string;
};

function requireClient() {
  if (!isSupabaseConfigured() || !isRealSupabaseClient(supabaseClient)) {
    return null;
  }
  return supabaseClient as unknown as import('@supabase/supabase-js').SupabaseClient;
}

export async function loadCloudReportKpis(
  accountId: string,
  cooperativeId?: string | null
): Promise<CloudReportKpis> {
  const coop = cooperativeId?.trim() || DEFAULT_COOPERATIVE_ID;
  const pending = await countPendingOutbox(accountId).catch(() => 0);
  const client = requireClient();
  if (!client) {
    return {
      cooperativeId: coop,
      sitesActive: null,
      agentsCount: null,
      surveyResponses: null,
      questionnairesPublished: null,
      outboxPendingLocal: pending,
      unavailableReason: 'Serveur non configuré.',
    };
  }

  try {
    const [sites, agents, surveys, questionnaires] = await Promise.all([
      client
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('cooperative_id', coop)
        .eq('status', 'active'),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('cooperative_id', coop)
        .eq('role', 'AGENT_TERRAIN'),
      client
        .from('survey_responses_remote')
        .select('id', { count: 'exact', head: true })
        .eq('cooperative_id', coop),
      client
        .from('questionnaires_remote')
        .select('id', { count: 'exact', head: true })
        .eq('cooperative_id', coop)
        .eq('status', 'published'),
    ]);

    return {
      cooperativeId: coop,
      sitesActive: sites.count ?? 0,
      agentsCount: agents.count ?? 0,
      surveyResponses: surveys.count ?? 0,
      questionnairesPublished: questionnaires.count ?? 0,
      outboxPendingLocal: pending,
    };
  } catch (e) {
    return {
      cooperativeId: coop,
      sitesActive: null,
      agentsCount: null,
      surveyResponses: null,
      questionnairesPublished: null,
      outboxPendingLocal: pending,
      unavailableReason: e instanceof Error ? e.message : 'Agrégats indisponibles',
    };
  }
}

export async function listRecentSurveyResponses(
  cooperativeId: string,
  limit = 50
): Promise<CloudReportRow[]> {
  const client = requireClient();
  if (!client) return [];
  const { data, error } = await client
    .from('survey_responses_remote')
    .select('id, template_key, business_status, updated_at')
    .eq('cooperative_id', cooperativeId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: String((r as { id: string }).id),
    templateKey: String((r as { template_key: string }).template_key),
    businessStatus: String((r as { business_status: string }).business_status),
    updatedAt: String((r as { updated_at: string }).updated_at),
  }));
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportReportsCsv(params: {
  kpis: CloudReportKpis;
  rows: CloudReportRow[];
}): Promise<void> {
  const lines: string[] = [];
  lines.push('section;cle;valeur');
  lines.push(`synthese;cooperative_id;${csvEscape(params.kpis.cooperativeId)}`);
  lines.push(
    `synthese;sites_actifs;${params.kpis.sitesActive ?? 'N/A'}`
  );
  lines.push(`synthese;agents;${params.kpis.agentsCount ?? 'N/A'}`);
  lines.push(`synthese;collectes;${params.kpis.surveyResponses ?? 'N/A'}`);
  lines.push(
    `synthese;questionnaires_publies;${params.kpis.questionnairesPublished ?? 'N/A'}`
  );
  lines.push(`synthese;outbox_pending_local;${params.kpis.outboxPendingLocal}`);
  lines.push('');
  lines.push('collecte_id;template;statut;updated_at');
  for (const r of params.rows) {
    lines.push(
      [r.id, r.templateKey, r.businessStatus, r.updatedAt].map(csvEscape).join(';')
    );
  }
  const csv = lines.join('\n');
  const fileName = `scpb-rapports-${Date.now()}.csv`;
  const path = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Share.share(
    Platform.OS === 'ios'
      ? { url: path, title: 'Rapports SCPB' }
      : { message: csv, title: fileName }
  );
}
