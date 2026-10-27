import 'server-only';

import { findBannedTerm } from '@electralens/i18n';

import { AggregateTable } from '@/lib/aggregates';
import { areaLabels } from '@/lib/areas';
import { getAggregates, getArea, latestPublication, listFindings } from '@/lib/data/public';
import { ruleName } from '@/lib/findings';
import { OFFICIAL } from '@/lib/official';

import { generate, GeminiUnavailable } from './gemini';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export type ChatReply =
  { status: 'ok'; text: string; model: string } | { status: 'unavailable' | 'refused' | 'invalid' };

export const MAX_QUESTION = 500;
const MAX_TURNS = 6;

const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari script)' };

const KNOWLEDGE = `ElectraLens is an independent, non-partisan public-interest tool. It is not affiliated with, sponsored by or endorsed by the Election Commission of India (ECI). All data on this deployment is synthetic demonstration data: fictional people, constituencies, parts and polling stations.

What it does:
- Compares two published versions of an electoral roll and publishes only aggregate counts per area (state, district, assembly constituency, part): electors before and after, additions, deletions, corrections, deletions by recorded reason, gender and age bands. Counts below 10 are suppressed as "< 10" so no small group can be singled out.
- Runs an open statistical methodology (version 2026.1) of rules R01-R12, for example unusual deletion or addition rates against similar parts, many deletions sharing one recorded reason, near-duplicate names, unusual age patterns and household changes. Each finding shows its evidence, the comparison baseline, innocent alternative explanations and limitations. A finding is an unusual pattern, never proof of wrongdoing.
- Every finding is reviewed by a human reviewer (accepted, downgraded or rejected, with a reason). Publishing needs two different people to approve (the two-person rule). Nobody can review their own run.
- Each publication has a manifest listing the SHA-256 hashes of its report and aggregates. The manifest hash is anchored on the Ethereum Hoodi test network in the ElectraLensRegistry contract and also timestamped with OpenTimestamps on Bitcoin.
- The Verify page (/verify) lets anyone download the files, recompute the hashes in their own browser and read the anchor directly from the blockchain: MATCH means nothing was changed after publication. A tamper demo shows a MISMATCH when one number is changed.
- The Compare page (/compare) shows charts by area with a location picker. Each area's addition and deletion rates get a level (Normal, Unusual, Highly unusual) from a fixed robust statistical rule comparing it with neighbouring areas; AI only explains it in words.
- The Claims checker (/claims) checks a structured claim such as "deletions in X were more than N" against published figures and returns Consistent, Contradicted, Disputed or Cannot be established. Claims about cause or intent always get "Cannot be established".
- Booth pages (/booths, /b/<code>) show a polling station's details with a QR code; there is no search by person and no per-voter QR.
- Privacy: ElectraLens never lets anyone look up an individual voter; individual records are visible only to authorised reviewers. Visitor IPs are stored only as salted hashes.

Official ECI services (ElectraLens only links to them):
- Voters' Service Portal: ${OFFICIAL.votersPortal}
- Search your name in the electoral roll: ${OFFICIAL.electoralSearch}
- Election Commission of India: ${OFFICIAL.eci}
- Voter helpline: 1950
- Form 6: register as a new voter. Form 6A: overseas electors. Form 7: object to an entry or ask for a deletion. Form 8: correct entries, shift residence, replace the EPIC card or mark a person with disability.

Pages: / (home), /findings, /compare, /publications, /verify, /claims, /booths, /datasets, /methodology, /assistant (guided steps), /official-links, /about, /privacy.`;

const SYSTEM = `You are the ElectraLens help assistant on the ElectraLens website.
Answer only questions about: ElectraLens and how it works, the published demo data and findings described in the facts, statistics and methodology, verification and blockchain anchoring, electoral rolls and voter registration in general, and the official ECI services.
Rules:
- Use only the facts given. If the facts do not answer the question, say you don't know and point to the relevant page or official service. Never invent numbers, places or events.
- Never accuse anyone, never suggest fraud, rigging or intent, never discuss political parties, candidates, officials or elections results, and never give opinions on who to vote for. Unusual patterns are not proof of wrongdoing.
- You cannot look up or check any individual voter. For a person's own registration, send them to the official electoral search or voters' portal, or the 1950 helpline.
- The data here is synthetic demonstration data; say so if someone treats it as real.
- For anything off-topic, politely say what you can help with instead.
- Keep answers under 120 words, in plain short sentences. Mention a page path such as /verify when it helps. No markdown headings or tables; a short list is fine.`;

/** The live publication in a few lines, rebuilt at most every five minutes. */
let snapshot: { at: number; text: string } | null = null;

async function liveFacts(locale: string): Promise<string> {
  if (snapshot && Date.now() - snapshot.at < 5 * 60_000) return snapshot.text;
  const publication = await latestPublication();
  if (!publication) return 'No publication has been published yet.';
  const lines = [
    `Latest publication: ${publication.series_id} number ${publication.sequence}, published ${publication.published_at ?? 'recently'}.`,
  ];
  const anchor = publication.blockchain_anchors.find((a) => a.anchor_type === 'evm');
  if (anchor) lines.push(`Blockchain anchor status: ${anchor.status}.`);
  const root = await getArea(publication.series_id);
  if (root) {
    const table = new AggregateTable(await getAggregates(publication.id, [root.id]));
    const value = (metric: string) => table.value(root.id, metric) ?? 'n/a';
    lines.push(
      `Totals for the whole series area: earlier roll ${value('electors_baseline')}, later roll ${value('electors_target')}, additions ${value('additions')}, deletions ${value('deletions')}, corrections ${value('corrections')}, net change ${value('net_change')}.`,
    );
  }
  const { rows, total } = await listFindings({ run: publication.run_id ?? undefined, page: 1 });
  const labels = await areaLabels(
    rows.map((row) => row.jurisdiction_id),
    locale,
  );
  lines.push(`Findings in this publication: ${total}. The first ones (strongest first):`);
  for (const row of rows.slice(0, 12)) {
    const area = labels.get(row.jurisdiction_id);
    lines.push(
      `- ${row.finding_code}: ${row.rule_id} ${ruleName('en', row.rule_id)} in ${area ? `${area.label} (${area.code})` : 'an area'}; signal ${row.signal_strength}; review ${row.review_status}; page /findings/${row.id}`,
    );
  }
  snapshot = { at: Date.now(), text: lines.join('\n') };
  return snapshot.text;
}

/** One assistant reply to the conversation so far. Nothing is stored. */
export async function answer(turns: ChatTurn[], locale: string): Promise<ChatReply> {
  const recent = turns.slice(-MAX_TURNS);
  const question = recent.at(-1);
  if (!question || question.role !== 'user' || !question.text.trim()) return { status: 'invalid' };

  const transcript = recent
    .map((turn) => `${turn.role === 'user' ? 'Visitor' : 'Assistant'}: ${turn.text}`)
    .join('\n');
  const prompt = `Reply in ${LANGUAGE[locale] ?? 'English'} unless the visitor clearly writes in another language.

Facts about ElectraLens:
${KNOWLEDGE}

Live data:
${await liveFacts(locale)}

Conversation:
${transcript}

Write the assistant's next reply.`;

  let reply: { text: string; model: string };
  try {
    reply = await generate(SYSTEM, prompt);
  } catch (error) {
    if (error instanceof GeminiUnavailable) return { status: 'unavailable' };
    throw error;
  }
  const clean = reply.text.replace(/[#`]+/g, '').replace(/\*\*/g, '').trim();
  if (findBannedTerm(clean)) return { status: 'refused' };
  return { status: 'ok', text: clean, model: reply.model };
}
