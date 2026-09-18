import type { RulePack } from '../types';
import cmPack from '../../packs/cm_2026_1.json';

export function loadEmbeddedCmPack(): RulePack {
  return cmPack as RulePack;
}

export function validateRulePack(pack: unknown): pack is RulePack {
  if (!pack || typeof pack !== 'object') return false;
  const p = pack as Record<string, unknown>;
  if (typeof p.id !== 'string') return false;
  if (typeof p.country !== 'string') return false;
  if (typeof p.factSchemaVersion !== 'string') return false;
  if (!['DRAFT', 'PUBLISHED', 'RETIRED'].includes(String(p.status))) return false;
  const params = p.parameters as Record<string, unknown> | undefined;
  if (!params || typeof params.minimumWorkingAge !== 'number') return false;
  if (typeof params.hazardousWorkMinimumAge !== 'number') return false;
  if (!Array.isArray(params.hazardousActivities)) return false;
  return true;
}
