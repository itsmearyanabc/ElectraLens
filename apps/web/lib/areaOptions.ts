import 'server-only';

import { getTranslations } from 'next-intl/server';

import { areaTree, getTopAreas } from './data/public';
import { localName } from './data/types';

/** Every area down to `maxDepth` (0 state, 1 district, 2 constituency, 3 part), for a picker. */
export async function areaOptions(locale: string, maxDepth = 2) {
  const t = await getTranslations({ locale });
  const trees = await Promise.all((await getTopAreas()).map((top) => areaTree(top.id)));
  return trees
    .flat()
    .filter(({ depth }) => depth <= maxDepth)
    .map(({ area, depth }) => ({
      code: area.code,
      label: `${localName(area.name, locale)} · ${t(`level.${area.level}`)}`,
      depth,
    }));
}
