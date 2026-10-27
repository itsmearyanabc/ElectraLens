import { z } from 'zod';

/** Area, series and station codes: upper-case ASCII segments joined by hyphens. */
export const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
export const AC_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*-AC[0-9]{3}$/;
export const LOCALE_PATTERN = /^[a-z]{2,3}$/;

export const code = z.string().regex(CODE_PATTERN).max(64);
export const acCode = z.string().regex(AC_CODE_PATTERN).max(64);
export const hex64 = z.string().regex(/^[0-9a-f]{64}$/);

/** Decimals are fixed-scale strings so Python and JavaScript hash identical bytes. */
export const decimal6 = z.string().regex(/^-?(?:0|[1-9][0-9]*)\.[0-9]{6}$/);

const localeString = z.string().min(1).max(300);

/** Text in several languages. English is always present; other keys are locale codes. */
export const localeText = z.object({ en: localeString }).catchall(localeString);

const localeParagraph = z.string().min(1).max(2000);

/** Longer multilingual text, such as a finding's explanation. */
export const localeLongText = z.object({ en: localeParagraph }).catchall(localeParagraph);

export const isoDate = z.iso.date();
export const isoDateTime = z.iso.datetime();
