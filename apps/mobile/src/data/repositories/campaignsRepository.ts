import { getDatabase, newId, nowIso, runTransaction } from '../db';
import { enqueueOutboxInTx } from './outboxRepository';
import {
  campaignInputError,
  pickActiveCampaign,
  type Campaign,
  type CampaignStatus,
} from '../../survey/campaigns';

type Row = {
  id: string;
  cooperative_id: string | null;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
  revision: number;
  created_at: string;
};

function mapRow(row: Row): Campaign {
  return {
    id: row.id,
    cooperativeId: row.cooperative_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: (row.status === 'closed' ? 'closed' : 'active') as CampaignStatus,
  };
}

/** Campaigns of the cooperative, newest first (pulled from the server for every role). */
export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, cooperative_id, name, starts_on, ends_on, status, revision, created_at
     FROM campaigns ORDER BY starts_on DESC`
  );
  return rows.map(mapRow);
}

export async function getActiveCampaign(at: string | Date = new Date()): Promise<Campaign | null> {
  return pickActiveCampaign(await listCampaigns(), at);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT id, cooperative_id, name, starts_on, ends_on, status, revision, created_at
     FROM campaigns WHERE id = ?`,
    [id]
  );
  return row ? mapRow(row) : null;
}

function outboxPayload(campaign: Campaign, createdAt: string) {
  return {
    id: campaign.id,
    name: campaign.name,
    startsOn: campaign.startsOn,
    endsOn: campaign.endsOn,
    status: campaign.status,
    cooperativeId: campaign.cooperativeId,
    createdAt,
  };
}

/** Admin only (the server rejects other roles). */
export async function createCampaign(
  accountId: string,
  cooperativeId: string | null,
  input: { name: string; startsOn: string; endsOn: string }
): Promise<Campaign> {
  const error = campaignInputError(input);
  if (error) throw new Error(error);
  const db = await getDatabase();
  const ts = nowIso();
  const campaign: Campaign = {
    id: newId(),
    cooperativeId,
    name: input.name.trim(),
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    status: 'active',
  };
  await runTransaction(db, async (tx) => {
    await tx.runAsync(
      `INSERT INTO campaigns (
        id, account_id, cooperative_id, name, starts_on, ends_on, status, created_at, updated_at, revision
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, 1)`,
      [campaign.id, accountId, cooperativeId, campaign.name, campaign.startsOn, campaign.endsOn, ts, ts]
    );
    await enqueueOutboxInTx(tx, accountId, 'campaign', campaign.id, 'create', outboxPayload(campaign, ts), 1);
  });
  return campaign;
}

export async function closeCampaign(accountId: string, campaignId: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT id, cooperative_id, name, starts_on, ends_on, status, revision, created_at
     FROM campaigns WHERE id = ?`,
    [campaignId]
  );
  if (!row || row.status === 'closed') return;
  const ts = nowIso();
  const revision = row.revision + 1;
  const campaign = { ...mapRow(row), status: 'closed' as const };
  await runTransaction(db, async (tx) => {
    await tx.runAsync(
      `UPDATE campaigns SET status = 'closed', updated_at = ?, revision = ? WHERE id = ?`,
      [ts, revision, campaignId]
    );
    await enqueueOutboxInTx(
      tx,
      accountId,
      'campaign',
      campaignId,
      'update',
      outboxPayload(campaign, row.created_at),
      revision
    );
  });
}
