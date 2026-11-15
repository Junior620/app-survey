import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  campaignInputError,
  pickActiveCampaign,
  pickCampaignResponse,
  previousCampaignResponses,
  responseInCampaign,
  type Campaign,
} from './campaigns';

const c2026: Campaign = { id: 'c26', cooperativeId: 'coop', name: '2026-2027', startsOn: '2026-10-01', endsOn: '2027-09-30', status: 'active' };
const c2025: Campaign = { id: 'c25', cooperativeId: 'coop', name: '2025-2026', startsOn: '2025-10-01', endsOn: '2026-09-30', status: 'active' };

describe('campagnes', () => {
  it('choisit la campagne active qui couvre la date, la plus récente en cas de chevauchement', () => {
    assert.equal(pickActiveCampaign([c2025, c2026], '2026-11-15T10:00:00')?.id, 'c26');
    assert.equal(pickActiveCampaign([c2025, c2026], '2026-03-01T10:00:00')?.id, 'c25');
    const overlap: Campaign = { ...c2026, id: 'late', startsOn: '2026-11-01' };
    assert.equal(pickActiveCampaign([c2026, overlap], '2026-11-15T10:00:00')?.id, 'late');
    assert.equal(pickActiveCampaign([{ ...c2026, status: 'closed' }], '2026-11-15T10:00:00'), null);
    assert.equal(pickActiveCampaign([], '2026-11-15T10:00:00'), null);
  });

  it('rattache une ancienne réponse sans campagne par sa date de création', () => {
    assert.equal(responseInCampaign({ campaignId: null, createdAt: '2026-12-01T09:00:00' }, c2026), true);
    assert.equal(responseInCampaign({ campaignId: null, createdAt: '2026-06-01T09:00:00' }, c2026), false);
    assert.equal(responseInCampaign({ campaignId: 'c25', createdAt: '2026-12-01T09:00:00' }, c2026), false);
  });

  it('une enquête soumise lors de la campagne précédente redevient à faire', () => {
    const responses = [{ id: 'old', templateKey: 'enquete-menage', campaignId: 'c25', createdAt: '2026-05-01T09:00:00' }];
    assert.equal(pickCampaignResponse(responses, 'enquete-menage', 'menage', c2026), undefined);
    assert.deepEqual(previousCampaignResponses(responses, 'enquete-menage', 'menage', c2026).map((r) => r.id), ['old']);
    assert.equal(pickCampaignResponse(responses, 'enquete-menage', 'menage', null)?.id, 'old');
    assert.equal(pickCampaignResponse(responses, 'enquete-menage', 'autre', c2026)?.id, 'old');
  });

  it('valide le formulaire admin', () => {
    assert.equal(campaignInputError({ name: '2026-2027', startsOn: '2026-10-01', endsOn: '2027-09-30' }), null);
    assert.ok(campaignInputError({ name: '', startsOn: '2026-10-01', endsOn: '2027-09-30' }));
    assert.ok(campaignInputError({ name: 'x', startsOn: '01/10/2026', endsOn: '2027-09-30' }));
    assert.ok(campaignInputError({ name: 'x', startsOn: '2027-10-01', endsOn: '2026-09-30' }));
  });
});
