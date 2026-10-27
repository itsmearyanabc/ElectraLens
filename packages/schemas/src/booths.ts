import { z } from 'zod';

import { acCode, decimal6, localeText } from './common.ts';
import { field } from './meta.ts';

/**
 * One polling station. Public facility information only. Synthetic stations have no
 * coordinates, so a demo booth can never point at a real building.
 */
export const pollingStationsV1 = z.strictObject({
  station_code: field(
    z
      .string()
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*-PS[0-9]{3}$/)
      .max(64),
    { kind: 'code' },
    'none',
  ),
  ac_code: field(acCode, { kind: 'code' }, 'none'),
  parts_served: field(
    z.array(z.int().min(1).max(9999)).min(1).max(20),
    { kind: 'int_list' },
    'none',
  ),
  name: field(localeText, { kind: 'locale_text' }, 'none'),
  address: field(localeText, { kind: 'locale_text' }, 'none'),
  lat: field(decimal6.nullable(), { kind: 'decimal', nullable: true, scale: 6 }, 'none'),
  lng: field(decimal6.nullable(), { kind: 'decimal', nullable: true, scale: 6 }, 'none'),
  accessibility: field(
    z.strictObject({
      ramp: z.boolean(),
      ground_floor: z.boolean(),
      drinking_water: z.boolean(),
      toilet: z.boolean(),
      wheelchair: z.boolean(),
    }),
    { kind: 'flags' },
    'none',
  ),
  source_url: field(
    z
      .string()
      .regex(/^https?:\/\/\S+$/)
      .max(500)
      .nullable(),
    { kind: 'text', nullable: true },
    'none',
  ),
  is_synthetic: field(z.boolean(), { kind: 'boolean' }, 'none'),
});

export type PollingStationRowV1 = z.infer<typeof pollingStationsV1>;
