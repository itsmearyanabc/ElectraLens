// Citizen complaints: the categories and states the database accepts, shared by every page.

export const COMPLAINT_CATEGORIES = [
  'name_missing',
  'wrong_details',
  'wrongful_deletion',
  'booth_issue',
  'voter_card',
  'accessibility',
  'other',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_STATUSES = ['submitted', 'in_review', 'resolved', 'closed'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const STATUS_TONE = {
  submitted: 'orange',
  in_review: 'blue',
  resolved: 'navy',
  closed: 'muted',
} as const;

export const isCategory = (value: unknown): value is ComplaintCategory =>
  typeof value === 'string' && (COMPLAINT_CATEGORIES as readonly string[]).includes(value);

/** A draft the intake assistant proposes; the citizen reviews and edits it before filing. */
export interface ComplaintDraft {
  category: ComplaintCategory;
  title: string;
  summary: string;
}

/**
 * 12 digits, not starting with 0 or 1, passing the Verhoeff check digit: the shape of an
 * Aadhaar number. Only the shape is checked; nothing is sent anywhere (simulated e-KYC).
 */
export function aadhaarShapeOk(value: string): boolean {
  if (!/^[2-9][0-9]{11}$/.test(value)) return false;
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];
  let check = 0;
  [...value].reverse().forEach((digit, i) => {
    check = d[check]?.[p[i % 8]?.[Number(digit)] ?? 0] ?? 0;
  });
  return check === 0;
}
