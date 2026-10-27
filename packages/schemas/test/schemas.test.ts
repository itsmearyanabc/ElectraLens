import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  claimV1,
  electoralRollV1,
  SCHEMA_NAMES,
  toJsonSchema,
  type ElectoralRollRowV1,
} from '../src/index.ts';

const jsonDir = join(import.meta.dirname, '..', 'json');

const row: ElectoralRollRowV1 = {
  record_key: '0123456789ABCDEF',
  ac_code: 'DEMO-ST01-AC042',
  part_no: 47,
  serial_no: 12,
  name_local: 'सीता देवी',
  name_latin: 'Sita Devi',
  relative_name_local: 'राम कुमार',
  relative_name_latin: 'Ram Kumar',
  relation_type: 'H',
  gender: 'F',
  age: 42,
  house_no: '12-B',
  epic_like: 'DMA1234567',
  status: 'active',
  deletion_reason: null,
  qualifying_date: '2026-01-01',
  is_synthetic: true,
};

describe('generated JSON Schemas', () => {
  it.each(SCHEMA_NAMES)('%s matches the committed file (run `pnpm generate` if not)', (name) => {
    const committed: unknown = JSON.parse(
      readFileSync(join(jsonDir, `${name}.schema.json`), 'utf8'),
    );
    expect(committed).toEqual(toJsonSchema(name));
  });

  it('carries canonicalisation and privacy metadata on every dataset field', () => {
    for (const name of ['electoral_roll_v1', 'polling_stations_v1'] as const) {
      const schema = toJsonSchema(name) as {
        properties: Record<string, Record<string, unknown>>;
      };
      for (const [field, spec] of Object.entries(schema.properties)) {
        expect(spec['x-canon'], `${name}.${field}`).toBeDefined();
        expect(['direct', 'quasi', 'none'], `${name}.${field}`).toContain(spec['x-classification']);
      }
    }
  });

  it('has no party, candidate or vote fields in the roll (NFR-3)', () => {
    const fields = Object.keys(electoralRollV1.shape).join(' ');
    expect(fields).not.toMatch(/party|candidate|vote|turnout/i);
  });
});

describe('electoral_roll_v1', () => {
  it('accepts a valid row', () => {
    expect(electoralRollV1.parse(row)).toEqual(row);
  });

  it('rejects unknown fields', () => {
    expect(electoralRollV1.safeParse({ ...row, party: 'X' }).success).toBe(false);
  });

  it('accepts impossible ages so rule R03 can flag them', () => {
    expect(electoralRollV1.safeParse({ ...row, age: 134 }).success).toBe(true);
  });
});

describe('claim_v1', () => {
  const base = {
    claim_type: 'number' as const,
    area_code: 'DEMO-ST01-AC042',
    metric: 'deletions' as const,
    deletion_reason: null,
    comparator: 'at_least' as const,
    value: 5000,
    unit: 'count' as const,
    period: { baseline: '2026-01-01', target: '2027-01-01' },
    language: 'hi',
  };

  it('accepts a complete number claim', () => {
    expect(claimV1.safeParse(base).success).toBe(true);
  });

  it('requires numbers for number claims', () => {
    expect(claimV1.safeParse({ ...base, value: null }).success).toBe(false);
  });

  it('accepts a cause-or-intent claim without numbers', () => {
    const claim = {
      ...base,
      claim_type: 'cause_or_intent' as const,
      metric: null,
      comparator: null,
      value: null,
      unit: null,
      period: null,
    };
    expect(claimV1.safeParse(claim).success).toBe(true);
  });
});
