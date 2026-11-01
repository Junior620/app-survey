import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fr } from './fr';
import { en } from './en';

function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

describe('i18n catalogs', () => {
  it('FR and EN define the same keys', () => {
    const f = new Set(keys(fr));
    const e = new Set(keys(en));
    assert.deepEqual([...f].filter((k) => !e.has(k)), [], 'missing in EN');
    assert.deepEqual([...e].filter((k) => !f.has(k)), [], 'missing in FR');
  });
});
