/**
 * Contract Expo SQLite ↔ Android Room (documentation).
 * Sharing IDs is NOT a functional bridge.
 * Do not run a second full Android implementation during Expo phases.
 *
 * | Expo / shared     | Android Room              | Notes |
 * |-------------------|---------------------------|-------|
 * | Planteur          | ProducteurEntity          | UUID offline |
 * | Parcelle          | PlantationEntity          | Surfaces séparées |
 * | Site/Secteur/Vill | (none yet)                | New org — Android later |
 * | Visite (future)   | VisiteEntity              | Snapshot secteurId |
 * | Lot               | RecolteLotEntity          | Keep codes |
 * | Protection        | Enfant / Remediation…     | Demo-only until Backend |
 *
 * Outbox idempotencyKey: `{entityType}:{entityId}:{revision}:{op}`
 */

export const ANDROID_ROOM_CONTRACT_VERSION = '1.0.0-draft';

export interface IdBridgeHint {
  expoEntity: string;
  androidTable: string;
  idStrategy: 'uuid_v4' | 'legacy_string';
}

export const ID_BRIDGE_HINTS: IdBridgeHint[] = [
  { expoEntity: 'planteur', androidTable: 'producteurs', idStrategy: 'uuid_v4' },
  { expoEntity: 'parcelle', androidTable: 'plantations', idStrategy: 'uuid_v4' },
  { expoEntity: 'lot', androidTable: 'recolte_lots', idStrategy: 'legacy_string' },
];
