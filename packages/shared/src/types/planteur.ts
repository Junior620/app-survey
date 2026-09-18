import type { EntityStatus } from './org';

export type IdDocumentAvailability = 'provided' | 'not_available' | 'not_collected';

export interface Planteur {
  id: string;
  accountId: string;
  code: string;
  nom: string;
  prenoms: string;
  telephone: string | null;
  villageId: string | null;
  secteurId: string;
  siteId: string;
  cooperativeId: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentAvailability: IdDocumentAvailability;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export type MappingStatus =
  | 'not_started'
  | 'point_only'
  | 'contour_draft'
  | 'contour_complete'
  | 'pending_validation'
  | 'validated';

export interface Parcelle {
  id: string;
  accountId: string;
  planteurId: string;
  siteId: string;
  code: string;
  name: string;
  locality: string | null;
  culturePrincipale: string;
  culturesAssociees: string | null;
  anneePlantation: number | null;
  superficieDeclareeHa: number | null;
  superficieMesureeHa: number | null;
  methodeMesure: string | null;
  mappingStatus: MappingStatus;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface Menage {
  id: string;
  accountId: string;
  siteId: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface PlanteurMenage {
  planteurId: string;
  menageId: string;
  relation: string | null;
}
