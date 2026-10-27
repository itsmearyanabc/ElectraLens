import 'server-only';

import { AggregateTable } from './aggregates';
import { getAggregates, getAreaById, getChildAreas, type Area } from './data/public';
import { changeRate, rateLevels, type RateLevel } from './levels';

export interface AreaChange {
  area: Area;
  baseline: number | null;
  target: number | null;
  additions: number | null;
  deletions: number | null;
  net: number | null;
  additionRate: number | null;
  deletionRate: number | null;
  /** Among the areas compared with it; null when there are too few or a value is suppressed. */
  additionLevel: RateLevel | null;
  deletionLevel: RateLevel | null;
}

export interface AreaComparison {
  table: AggregateTable;
  /** This area, levelled against the other areas under the same parent. */
  self: AreaChange;
  parent: Area | null;
  peerCount: number;
  /** The areas inside this one, levelled against each other. */
  children: AreaChange[];
}

function changes(table: AggregateTable, areas: Area[]): AreaChange[] {
  const rows = areas.map((area) => {
    const baseline = table.value(area.id, 'electors_baseline');
    const additions = table.value(area.id, 'additions');
    const deletions = table.value(area.id, 'deletions');
    return {
      area,
      baseline,
      target: table.value(area.id, 'electors_target'),
      additions,
      deletions,
      net: table.value(area.id, 'net_change'),
      additionRate: changeRate(additions, baseline),
      deletionRate: changeRate(deletions, baseline),
    };
  });
  const additionLevels = rateLevels(rows.map((row) => row.additionRate));
  const deletionLevels = rateLevels(rows.map((row) => row.deletionRate));
  return rows.map((row, index) => ({
    ...row,
    additionLevel: additionLevels[index] ?? null,
    deletionLevel: deletionLevels[index] ?? null,
  }));
}

/** Published totals, rates and levels for one area, its neighbours and the areas inside it. */
export async function compareArea(publicationId: string, area: Area): Promise<AreaComparison> {
  const [children, parent] = await Promise.all([
    getChildAreas(area.id),
    area.parent_id ? getAreaById(area.parent_id) : Promise.resolve(null),
  ]);
  const siblings = parent ? await getChildAreas(parent.id) : [area];
  const ids = [...new Set([area, ...children, ...siblings].map((a) => a.id))];
  const table = new AggregateTable(await getAggregates(publicationId, ids));
  const peers = changes(table, siblings);
  const self = peers.find((row) => row.area.id === area.id) ?? changes(table, [area])[0];
  if (!self) throw new Error('area missing from its own comparison');
  return {
    table,
    self,
    parent,
    peerCount: siblings.length,
    children: changes(table, children),
  };
}
