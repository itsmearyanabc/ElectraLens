import 'server-only';

import { evaluate, type Claim, type ClaimResult } from '@electralens/claims';

import { AggregateTable } from './aggregates';
import { getAggregates, getArea, isAreaCode, latestPublication } from './data/public';

// The rules live in @electralens/claims, shared with the API; this file only fetches the figure.
export {
  CLAIM_METHOD,
  CLAIM_METRICS,
  CLAIM_TYPES,
  COMPARATORS,
  judge,
  tolerance,
} from '@electralens/claims';
export type { Claim, ClaimReason, ClaimResult } from '@electralens/claims';

export async function evaluateClaim(claim: Claim): Promise<ClaimResult> {
  if (claim.claimType === 'cause_or_intent') {
    return evaluate(claim, { publication: null, areaFound: false, cell: null });
  }
  const publication = await latestPublication();
  const area = publication && isAreaCode(claim.areaCode) ? await getArea(claim.areaCode) : null;
  const cell =
    publication && area
      ? new AggregateTable(await getAggregates(publication.id, [area.id])).get(
          area.id,
          claim.metric,
        )
      : null;
  return evaluate(claim, {
    publication: publication
      ? { id: publication.id, series: publication.series_id, sequence: publication.sequence }
      : null,
    areaFound: area !== null,
    cell,
  });
}
