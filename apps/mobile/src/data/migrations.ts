import type { SQLiteDatabase } from 'expo-sqlite';

/** Schema migrations only — never seed sample data here. */
export const SCHEMA_VERSION = 5;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sites (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          locality TEXT NOT NULL,
          cooperative_id TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          UNIQUE(account_id, code)
        );

        CREATE TABLE IF NOT EXISTS secteurs (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          responsable_agent_id TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          boundary_geojson TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          UNIQUE(account_id, site_id, code),
          FOREIGN KEY (site_id) REFERENCES sites(id)
        );

        CREATE TABLE IF NOT EXISTS villages (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          admin_region TEXT,
          admin_department TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS secteur_villages (
          secteur_id TEXT NOT NULL,
          village_id TEXT NOT NULL,
          PRIMARY KEY (secteur_id, village_id),
          FOREIGN KEY (secteur_id) REFERENCES secteurs(id),
          FOREIGN KEY (village_id) REFERENCES villages(id)
        );

        CREATE TABLE IF NOT EXISTS agent_affectations (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          secteur_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (secteur_id) REFERENCES secteurs(id)
        );

        CREATE TABLE IF NOT EXISTS affectation_historique (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          secteur_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          reason TEXT
        );

        CREATE TABLE IF NOT EXISTS planteurs (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          code TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenoms TEXT NOT NULL,
          telephone TEXT,
          village_id TEXT,
          secteur_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          cooperative_id TEXT,
          id_document_type TEXT,
          id_document_number TEXT,
          id_document_availability TEXT NOT NULL DEFAULT 'not_collected',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          UNIQUE(account_id, code),
          FOREIGN KEY (site_id) REFERENCES sites(id),
          FOREIGN KEY (secteur_id) REFERENCES secteurs(id)
        );

        CREATE TABLE IF NOT EXISTS menages (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          label TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (site_id) REFERENCES sites(id)
        );

        CREATE TABLE IF NOT EXISTS planteur_menage (
          planteur_id TEXT NOT NULL,
          menage_id TEXT NOT NULL,
          relation TEXT,
          PRIMARY KEY (planteur_id, menage_id),
          FOREIGN KEY (planteur_id) REFERENCES planteurs(id),
          FOREIGN KEY (menage_id) REFERENCES menages(id)
        );

        CREATE TABLE IF NOT EXISTS parcelles (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          planteur_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          locality TEXT,
          culture_principale TEXT NOT NULL DEFAULT 'cacao',
          cultures_associees TEXT,
          annee_plantation INTEGER,
          superficie_declaree_ha REAL,
          superficie_mesuree_ha REAL,
          methode_mesure TEXT,
          mapping_status TEXT NOT NULL DEFAULT 'not_started',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          UNIQUE(account_id, code),
          FOREIGN KEY (planteur_id) REFERENCES planteurs(id),
          FOREIGN KEY (site_id) REFERENCES sites(id)
        );

        CREATE TABLE IF NOT EXISTS formations (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          title TEXT NOT NULL,
          theme TEXT NOT NULL,
          objectives TEXT,
          lieu TEXT,
          formateur TEXT,
          status TEXT NOT NULL DEFAULT 'planned',
          starts_at TEXT,
          ends_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (site_id) REFERENCES sites(id)
        );

        CREATE TABLE IF NOT EXISTS seances (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          formation_id TEXT NOT NULL,
          starts_at TEXT NOT NULL,
          ends_at TEXT,
          lieu TEXT,
          status TEXT NOT NULL DEFAULT 'planned',
          comment TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (formation_id) REFERENCES formations(id)
        );

        CREATE TABLE IF NOT EXISTS participations (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          seance_id TEXT NOT NULL,
          planteur_id TEXT NOT NULL,
          attendance TEXT NOT NULL DEFAULT 'not_marked',
          marked_at TEXT,
          marked_by_agent_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          UNIQUE(seance_id, planteur_id),
          FOREIGN KEY (seance_id) REFERENCES seances(id),
          FOREIGN KEY (planteur_id) REFERENCES planteurs(id)
        );

        CREATE TABLE IF NOT EXISTS missions (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          site_id TEXT NOT NULL,
          secteur_id TEXT,
          agent_id TEXT NOT NULL,
          type TEXT NOT NULL,
          object_id TEXT,
          object_label TEXT,
          due_at TEXT,
          priority TEXT NOT NULL DEFAULT 'normale',
          status TEXT NOT NULL DEFAULT 'todo',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (site_id) REFERENCES sites(id)
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          mime_type TEXT,
          byte_size INTEGER,
          caption TEXT,
          access_level TEXT NOT NULL DEFAULT 'standard',
          captured_at TEXT,
          added_at TEXT NOT NULL,
          author_id TEXT NOT NULL,
          transfer_status TEXT NOT NULL DEFAULT 'pending',
          revision INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS geometry_versions (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          parcelle_id TEXT NOT NULL,
          geojson TEXT NOT NULL,
          mode TEXT NOT NULL,
          area_ha REAL,
          point_count INTEGER,
          created_at TEXT NOT NULL,
          author_id TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (parcelle_id) REFERENCES parcelles(id)
        );

        CREATE TABLE IF NOT EXISTS sync_outbox (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          depends_on TEXT,
          transfer_status TEXT NOT NULL DEFAULT 'pending',
          revision INTEGER NOT NULL DEFAULT 1,
          idempotency_key TEXT NOT NULL UNIQUE,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_sites_account ON sites(account_id);
        CREATE INDEX IF NOT EXISTS idx_planteurs_site ON planteurs(site_id, account_id);
        CREATE INDEX IF NOT EXISTS idx_outbox_pending ON sync_outbox(account_id, transfer_status);
        CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_id, status);
      `);
      await db.execAsync(`PRAGMA user_version = 1`);
    });
    version = 1;
  }

  if (version < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS survey_responses (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          site_id TEXT,
          template_key TEXT NOT NULL,
          template_version TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          business_status TEXT NOT NULL DEFAULT 'draft',
          transfer_status TEXT NOT NULL DEFAULT 'pending',
          current_step INTEGER NOT NULL DEFAULT 1,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_survey_account ON survey_responses(account_id, business_status);
      `);
      await db.execAsync(`PRAGMA user_version = 2`);
    });
    version = 2;
  }

  if (version < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS questionnaires (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          usage TEXT NOT NULL DEFAULT 'questionnaire',
          category TEXT NOT NULL DEFAULT 'autre',
          subject_type TEXT NOT NULL DEFAULT 'planteur',
          instructions TEXT,
          confidentiality TEXT NOT NULL DEFAULT 'standard',
          status TEXT NOT NULL DEFAULT 'draft',
          published_version INTEGER,
          draft_version_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS questionnaire_versions (
          id TEXT PRIMARY KEY NOT NULL,
          questionnaire_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          state TEXT NOT NULL DEFAULT 'draft',
          definition_json TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_sections (
          id TEXT PRIMARY KEY NOT NULL,
          version_id TEXT NOT NULL,
          title TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          visibility_rules_json TEXT,
          FOREIGN KEY (version_id) REFERENCES questionnaire_versions(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_questions (
          id TEXT PRIMARY KEY NOT NULL,
          version_id TEXT NOT NULL,
          section_id TEXT NOT NULL,
          stable_key TEXT NOT NULL,
          type TEXT NOT NULL,
          label TEXT NOT NULL,
          help_text TEXT,
          required INTEGER NOT NULL DEFAULT 0,
          config_json TEXT,
          validation_json TEXT,
          visibility_rules_json TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (version_id) REFERENCES questionnaire_versions(id),
          FOREIGN KEY (section_id) REFERENCES questionnaire_sections(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_options (
          id TEXT PRIMARY KEY NOT NULL,
          question_id TEXT NOT NULL,
          stable_key TEXT NOT NULL,
          label TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_other INTEGER NOT NULL DEFAULT 0,
          is_exclusive INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (question_id) REFERENCES questionnaire_questions(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_assignments (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          questionnaire_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          site_id TEXT NOT NULL,
          secteur_id TEXT,
          campaign TEXT,
          starts_at TEXT NOT NULL,
          ends_at TEXT,
          frequency_rule TEXT NOT NULL DEFAULT 'multiple_visits',
          agent_scope TEXT NOT NULL DEFAULT 'all_site',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_audit (
          id TEXT PRIMARY KEY NOT NULL,
          questionnaire_id TEXT NOT NULL,
          actor_id TEXT,
          action TEXT NOT NULL,
          detail_json TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_q_account ON questionnaires(account_id, status);
        CREATE INDEX IF NOT EXISTS idx_qv_qid ON questionnaire_versions(questionnaire_id);
        CREATE INDEX IF NOT EXISTS idx_qq_vid ON questionnaire_questions(version_id);
        CREATE INDEX IF NOT EXISTS idx_qa_site ON questionnaire_assignments(site_id, status);
      `);
      await db.execAsync(`PRAGMA user_version = 3`);
    });
    version = 3;
  }

  if (version < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          local_revision INTEGER NOT NULL DEFAULT 0,
          remote_revision INTEGER NOT NULL DEFAULT 0,
          detail TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_conflicts_open
          ON sync_conflicts(account_id, status);
      `);
      await db.execAsync(`PRAGMA user_version = 4`);
    });
    version = 4;
  }

  if (version < 5) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS rule_packs (
          id TEXT PRIMARY KEY NOT NULL,
          country TEXT NOT NULL,
          rule_version TEXT NOT NULL,
          fact_schema_version TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          status TEXT NOT NULL,
          effective_from TEXT NOT NULL,
          effective_to TEXT,
          content_hash TEXT NOT NULL,
          source_references_json TEXT NOT NULL,
          parameters_json TEXT NOT NULL,
          approved_by TEXT,
          approved_at TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fact_mappings (
          id TEXT PRIMARY KEY NOT NULL,
          survey_template TEXT NOT NULL,
          survey_version TEXT NOT NULL,
          fact_schema_version TEXT NOT NULL,
          fields_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PUBLISHED',
          created_at TEXT NOT NULL,
          UNIQUE(survey_template, survey_version)
        );

        CREATE TABLE IF NOT EXISTS detection_runs (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          survey_response_id TEXT NOT NULL,
          enfant_id TEXT NOT NULL,
          household_id TEXT,
          rule_pack_id TEXT NOT NULL,
          engine_version TEXT NOT NULL,
          input_hash TEXT NOT NULL,
          evaluation_status TEXT NOT NULL,
          result_json TEXT NOT NULL,
          supersedes_run_id TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(survey_response_id, enfant_id, rule_pack_id, input_hash)
        );

        CREATE TABLE IF NOT EXISTS detection_signals (
          id TEXT PRIMARY KEY NOT NULL,
          run_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          rule_code TEXT NOT NULL,
          message_key TEXT NOT NULL,
          parameters_json TEXT NOT NULL,
          severity TEXT NOT NULL,
          detection_status TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (run_id) REFERENCES detection_runs(id)
        );

        CREATE TABLE IF NOT EXISTS remediation_cases (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL,
          survey_response_id TEXT NOT NULL,
          enfant_id TEXT,
          household_id TEXT,
          detection_run_id TEXT,
          primary_status TEXT NOT NULL,
          severity TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'A_VALIDER',
          protection_immediate INTEGER NOT NULL DEFAULT 0,
          supervisor_ack_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS remediation_case_events (
          id TEXT PRIMARY KEY NOT NULL,
          case_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          reason TEXT,
          actor_id TEXT,
          actor_role TEXT,
          metadata_json TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (case_id) REFERENCES remediation_cases(id)
        );

        CREATE INDEX IF NOT EXISTS idx_detection_runs_response
          ON detection_runs(survey_response_id, account_id);
        CREATE INDEX IF NOT EXISTS idx_detection_signals_run
          ON detection_signals(run_id);
        CREATE INDEX IF NOT EXISTS idx_remediation_cases_account
          ON remediation_cases(account_id, status);
        CREATE INDEX IF NOT EXISTS idx_remediation_events_case
          ON remediation_case_events(case_id, created_at);
      `);
      await db.execAsync(`PRAGMA user_version = 5`);
    });
  }
}
