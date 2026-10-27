import { z } from 'zod';

import { acCode, isoDate } from './common.ts';
import { field } from './meta.ts';

export const RELATION_TYPES = ['F', 'M', 'H', 'O'] as const; // father, mother, husband, other
export const GENDERS = ['M', 'F', 'T'] as const;
export const ROLL_STATUSES = ['active', 'deleted'] as const;
export const DELETION_REASONS = ['D', 'S', 'A', 'R'] as const; // dead, shifted, absent, repeated

const name = z.string().min(1).max(120);

/**
 * One elector row of an electoral roll version. Deleted electors appear with
 * `status = deleted` in the version that removed them, as in published deletion lists.
 * There is deliberately no field for party, candidate, vote share or turnout (NFR-3).
 */
export const electoralRollV1 = z.strictObject({
  record_key: field(z.string().regex(/^[0-9A-Z]{16}$/), { kind: 'code' }, 'direct'),
  ac_code: field(acCode, { kind: 'code' }, 'none'),
  part_no: field(z.int().min(1).max(9999), { kind: 'integer' }, 'quasi'),
  serial_no: field(z.int().min(1).max(99999), { kind: 'integer' }, 'direct'),
  name_local: field(name, { kind: 'text' }, 'direct'),
  name_latin: field(name, { kind: 'text' }, 'direct'),
  relative_name_local: field(name.nullable(), { kind: 'text', nullable: true }, 'direct'),
  relative_name_latin: field(name.nullable(), { kind: 'text', nullable: true }, 'direct'),
  relation_type: field(z.enum(RELATION_TYPES).nullable(), { kind: 'enum', nullable: true }, 'none'),
  gender: field(z.enum(GENDERS), { kind: 'enum' }, 'quasi'),
  // Wide range on purpose: impossible ages must be ingestible so rule R03 can flag them.
  age: field(z.int().min(0).max(150), { kind: 'integer' }, 'quasi'),
  house_no: field(z.string().min(1).max(40).nullable(), { kind: 'text', nullable: true }, 'direct'),
  epic_like: field(
    z
      .string()
      .regex(/^[A-Z]{3}[0-9]{7}$/)
      .nullable(),
    { kind: 'code', nullable: true },
    'direct',
  ),
  status: field(z.enum(ROLL_STATUSES), { kind: 'enum' }, 'none'),
  deletion_reason: field(
    z.enum(DELETION_REASONS).nullable(),
    { kind: 'enum', nullable: true },
    'none',
  ),
  qualifying_date: field(isoDate, { kind: 'date' }, 'none'),
  is_synthetic: field(z.boolean(), { kind: 'boolean' }, 'none'),
});

export type ElectoralRollRowV1 = z.infer<typeof electoralRollV1>;
