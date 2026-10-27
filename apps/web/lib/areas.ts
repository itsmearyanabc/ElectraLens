import 'server-only';

import { getAreasByIds, type Area } from './data/public';
import { localName } from './data/types';

export interface AreaLabel {
  code: string;
  level: Area['level'];
  label: string;
}

/** Display names for areas; a part is named with its constituency ("Part 22, Gurugram DEMO-1"). */
export async function areaLabels(
  ids: readonly string[],
  locale: string,
): Promise<Map<string, AreaLabel>> {
  const areas = await getAreasByIds(ids);
  const parentIds = [...areas.values()]
    .filter((area) => area.level === 'part' && area.parent_id)
    .map((area) => area.parent_id as string);
  const parents = await getAreasByIds(parentIds);
  return new Map(
    [...areas.values()].map((area) => {
      const parent =
        area.level === 'part' && area.parent_id ? parents.get(area.parent_id) : undefined;
      const name = localName(area.name, locale);
      return [
        area.id,
        {
          code: area.code,
          level: area.level,
          label: parent ? `${name}, ${localName(parent.name, locale)}` : name,
        },
      ];
    }),
  );
}
