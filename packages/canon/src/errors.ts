export type CanonErrorCode =
  | 'unknown_field'
  | 'required'
  | 'type'
  | 'not_well_formed'
  | 'control_char'
  | 'unsupported_char'
  | 'invalid_enum'
  | 'invalid_date'
  | 'invalid_integer'
  | 'decimal_scale'
  | 'duplicate_item'
  | 'invalid_locale'
  | 'schema'
  | 'float_not_allowed'
  | 'not_canonical'
  | 'not_sorted'
  | 'bad_salt';

/**
 * A canonicalisation failure. It names the field and a stable code but never the value,
 * so ingestion reports can't leak personal data (B03.05).
 */
export class CanonError extends Error {
  readonly code: CanonErrorCode;
  readonly field: string | null;
  readonly row: number | null;

  constructor(code: CanonErrorCode, field: string | null = null, row: number | null = null) {
    super(`${code}${field === null ? '' : ` at ${field}`}${row === null ? '' : ` (row ${row})`}`);
    this.name = 'CanonError';
    this.code = code;
    this.field = field;
    this.row = row;
  }

  atRow(row: number): CanonError {
    return new CanonError(this.code, this.field, row);
  }
}
