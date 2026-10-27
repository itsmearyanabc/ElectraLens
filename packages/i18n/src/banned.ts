import banned from '../banned-terms.json' with { type: 'json' };

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ENGLISH_WORDS = new RegExp(`\\b(?:${banned.en.words.map(escape).join('|')})\\b`, 'i');
const ACRONYMS = new RegExp(`\\b(?:${banned.en.acronyms.map(escape).join('|')})\\b`);

/**
 * The first banned term in `text`, or null (FR-EXP-4: never accuse, never name parties).
 * English words match case-insensitively on word boundaries, acronyms exactly, Hindi terms as
 * substrings, as banned-terms.json describes. Used on any text not written from a template.
 */
export function findBannedTerm(text: string): string | null {
  const english = text.match(ENGLISH_WORDS) ?? text.match(ACRONYMS);
  if (english) return english[0];
  return banned.hi.words.find((term) => text.includes(term)) ?? null;
}
