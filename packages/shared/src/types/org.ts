/**
 * Organisation terrain : Entreprise → Site/Station → Secteur → Village.
 * Coopérative = relation distincte (pas un alias de site).
 */

export type EntityStatus = 'active' | 'archived';

export interface Site {
  id: string;
  accountId: string;
  code: string;
  name: string;
  locality: string;
  cooperativeId: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface Secteur {
  id: string;
  accountId: string;
  siteId: string;
  code: string;
  name: string;
  responsableAgentId: string | null;
  status: EntityStatus;
  boundaryGeoJson: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface Village {
  id: string;
  accountId: string;
  name: string;
  adminRegion: string | null;
  adminDepartment: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface SecteurVillage {
  secteurId: string;
  villageId: string;
}

export interface AgentAffectation {
  id: string;
  accountId: string;
  agentId: string;
  secteurId: string;
  startedAt: string;
  endedAt: string | null;
  revision: number;
}

export interface AffectationHistorique {
  id: string;
  accountId: string;
  agentId: string;
  secteurId: string;
  startedAt: string;
  endedAt: string;
  reason: string | null;
}

export interface SiteListItem extends Site {
  planteurCount: number;
  formationsActiveCount: number;
  missionsPendingCount: number;
  outboxPendingCount: number;
}
