import { describe, expect, it } from 'vitest';

import {
  canonicalRow,
  CanonError,
  commitmentFromCanonicalLines,
  datasetCommitment,
  fromHex,
  hashDocument,
  inclusionProof,
  leafHash,
  merkleRoot,
  toHex,
  verifyInclusion,
} from '../src/index.ts';

// RFC 6962 reference leaves and roots (as used by Certificate Transparency implementations).
const RFC6962_LEAVES = [
  '',
  '00',
  '10',
  '2021',
  '3031',
  '40414243',
  '5051525354555657',
  '606162636465666768696a6b6c6d6e6f',
];
const RFC6962_ROOTS = [
  '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
  'fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125',
  'aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77',
  'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7',
  '4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4',
  '76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef',
  'ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c',
  '5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328',
];
const NO_SALT = new Uint8Array();
const SALT = fromHex('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff');

const row = {
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

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    if (error instanceof CanonError) return error.code;
    throw error;
  }
  return undefined;
};

describe('Merkle tree (RFC 6962)', () => {
  const leaves = RFC6962_LEAVES.map((hex) => leafHash(NO_SALT, fromHex(hex)));

  it('empty tree is SHA-256 of the empty string', () => {
    expect(toHex(merkleRoot([]))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it.each(RFC6962_ROOTS.map((root, i) => [i + 1, root] as const))(
    'root of the first %i reference leaves',
    (size, root) => {
      expect(toHex(merkleRoot(leaves.slice(0, size)))).toBe(root);
    },
  );

  it('every inclusion proof verifies, and fails against a different leaf', () => {
    for (let size = 1; size <= leaves.length; size += 1) {
      const subset = leaves.slice(0, size);
      const root = merkleRoot(subset);
      for (let i = 0; i < size; i += 1) {
        const proof = inclusionProof(i, subset);
        const leaf = subset[i] as Uint8Array;
        expect(verifyInclusion(leaf, i, size, proof, root)).toBe(true);
        const other = leafHash(NO_SALT, fromHex('ff'));
        expect(verifyInclusion(other, i, size, proof, root)).toBe(false);
      }
    }
  });
});

describe('row canonicalisation', () => {
  it('produces sorted-key JSON with every field present', () => {
    const withoutHouse: Record<string, unknown> = { ...row };
    delete withoutHouse.house_no;
    const text = canonicalRow(withoutHouse, 'electoral_roll_v1');
    expect(text.startsWith('{"ac_code":"DEMO-ST01-AC042","age":42,')).toBe(true);
    expect(text).toContain('"house_no":null');
  });

  it('treats CSV strings, NFD text and stray whitespace as the same row', () => {
    const csvLike = {
      ...row,
      part_no: '047',
      serial_no: ' 12 ',
      age: '42',
      is_synthetic: 'TRUE',
      ac_code: 'demo-st01-ac042',
      name_local: '  सीता\u00a0\u00a0देवी '.normalize('NFD'),
      name_latin: 'Sita \t Devi',
    };
    expect(canonicalRow(csvLike, 'electoral_roll_v1')).toBe(canonicalRow(row, 'electoral_roll_v1'));
  });

  it.each([
    ['unknown field', { ...row, party: 'X' }, 'unknown_field'],
    ['bad enum', { ...row, gender: 'X' }, 'invalid_enum'],
    ['impossible date', { ...row, qualifying_date: '2026-02-30' }, 'invalid_date'],
    ['fractional integer', { ...row, age: '42.5' }, 'invalid_integer'],
    ['control character', { ...row, name_latin: 'Sita\u0007' }, 'control_char'],
    ['missing required', { ...row, name_latin: '   ' }, 'required'],
    ['lone surrogate', { ...row, name_latin: 'Sita\ud800' }, 'not_well_formed'],
    ['schema pattern', { ...row, epic_like: 'BAD' }, 'schema'],
  ])('rejects %s', (_label, input, code) => {
    expect(errorCode(() => canonicalRow(input, 'electoral_roll_v1'))).toBe(code);
  });

  it('normalises booth decimals, lists and translations', () => {
    const booth = {
      station_code: 'DEMO-ST01-AC042-PS047',
      ac_code: 'DEMO-ST01-AC042',
      parts_served: '48;47',
      name: { en: 'DEMO School', hi: 'डेमो विद्यालय' },
      address: { en: 'Fictional Road' },
      lat: 28.5,
      lng: '77.000100',
      accessibility: {
        ramp: 'true',
        ground_floor: true,
        drinking_water: false,
        toilet: true,
        wheelchair: false,
      },
      source_url: '',
      is_synthetic: true,
    };
    const parsed = JSON.parse(canonicalRow(booth, 'polling_stations_v1')) as Record<
      string,
      unknown
    >;
    expect(parsed.parts_served).toEqual([47, 48]);
    expect(parsed.lat).toBe('28.500000');
    expect(parsed.lng).toBe('77.000100');
    expect(parsed.source_url).toBeNull();
    expect(
      errorCode(() => canonicalRow({ ...booth, lat: 28.1234567 }, 'polling_stations_v1')),
    ).toBe('decimal_scale');
    expect(
      errorCode(() => canonicalRow({ ...booth, parts_served: '1;1' }, 'polling_stations_v1')),
    ).toBe('duplicate_item');
  });
});

describe('dataset commitment', () => {
  const second = { ...row, record_key: '0123456789ABCDEG', serial_no: 13, name_latin: 'Gita Devi' };

  it('does not depend on row order', () => {
    const a = datasetCommitment([row, second], 'electoral_roll_v1', SALT);
    const b = datasetCommitment([second, row], 'electoral_roll_v1', SALT);
    expect(a.root).toBe(b.root);
    expect(a.rowCount).toBe(2);
  });

  it('changes when a single character changes', () => {
    const a = datasetCommitment([row, second], 'electoral_roll_v1', SALT);
    const b = datasetCommitment(
      [row, { ...second, name_latin: 'Gita Devy' }],
      'electoral_roll_v1',
      SALT,
    );
    expect(a.root).not.toBe(b.root);
  });

  it('reports the failing row index', () => {
    let caught: CanonError | undefined;
    try {
      datasetCommitment([row, { ...second, age: 'x' }], 'electoral_roll_v1', SALT);
    } catch (error) {
      caught = error as CanonError;
    }
    expect(caught?.row).toBe(1);
    expect(caught?.field).toBe('age');
  });

  it('requires a 32-byte salt', () => {
    expect(errorCode(() => datasetCommitment([row], 'electoral_roll_v1', new Uint8Array(4)))).toBe(
      'bad_salt',
    );
  });

  it('round-trips through canonical lines and rejects edited or unsorted files', () => {
    const c = datasetCommitment([row, second], 'electoral_roll_v1', SALT);
    expect(commitmentFromCanonicalLines(c.canonicalRows, 'electoral_roll_v1', SALT).root).toBe(
      c.root,
    );
    const edited = c.canonicalRows.map((line) => line.replace('"age":42', '"age":043'));
    expect(errorCode(() => commitmentFromCanonicalLines(edited, 'electoral_roll_v1', SALT))).toBe(
      'not_canonical',
    );
    const reversed = [...c.canonicalRows].reverse();
    expect(errorCode(() => commitmentFromCanonicalLines(reversed, 'electoral_roll_v1', SALT))).toBe(
      'not_sorted',
    );
  });
});

describe('document hashing', () => {
  it('ignores key order', () => {
    expect(hashDocument({ b: 1, a: [true, null, 'x'] })).toBe(
      hashDocument({ a: [true, null, 'x'], b: 1 }),
    );
  });

  it('refuses floats', () => {
    expect(errorCode(() => hashDocument({ rate: 0.18 }))).toBe('float_not_allowed');
  });
});
