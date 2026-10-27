import type { AggregateRow } from './data/public';
import type { Json } from './data/types';

export interface Cell {
  value: number | null;
  suppressed: boolean;
}

const dimsKey = (dims: Json) =>
  dims && typeof dims === 'object' && !Array.isArray(dims)
    ? Object.entries(dims)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&')
    : '';

/** Published aggregates indexed by area, metric and dimensions. */
export class AggregateTable {
  readonly #cells = new Map<string, Cell>();
  readonly #byMetric = new Map<string, { dims: Record<string, string>; cell: Cell }[]>();

  constructor(rows: AggregateRow[]) {
    for (const row of rows) {
      const cell = { value: row.value, suppressed: row.suppressed };
      this.#cells.set(`${row.jurisdiction_id}|${row.metric}|${dimsKey(row.dims)}`, cell);
      const key = `${row.jurisdiction_id}|${row.metric}`;
      const dims = (row.dims ?? {}) as Record<string, string>;
      if (Object.keys(dims).length > 0) {
        const list = this.#byMetric.get(key) ?? [];
        list.push({ dims, cell });
        this.#byMetric.set(key, list);
      }
    }
  }

  get(areaId: string, metric: string, dims: Record<string, string> = {}): Cell | null {
    return this.#cells.get(`${areaId}|${metric}|${dimsKey(dims)}`) ?? null;
  }

  value(areaId: string, metric: string): number | null {
    return this.get(areaId, metric)?.value ?? null;
  }

  /** Every dimension breakdown of one metric (for example deletions by reason). */
  breakdown(areaId: string, metric: string) {
    return this.#byMetric.get(`${areaId}|${metric}`) ?? [];
  }

  get size() {
    return this.#cells.size;
  }
}
