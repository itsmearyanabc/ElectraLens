import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { judge, tolerance } = await import('../lib/claims');
const { contentSecurityPolicy } = await import('../lib/csp');
const { safeNext } = await import('../lib/redirects');

describe('claim judgement (B11.02)', () => {
  it('uses max(1 %, 10) as the tolerance', () => {
    expect(tolerance(500)).toBe(10);
    expect(tolerance(3000)).toBe(30);
  });

  it('accepts figures within tolerance and rejects the rest', () => {
    expect(judge({ comparator: 'about', value: 2010 }, 2000)).toBe('consistent');
    expect(judge({ comparator: 'about', value: 2100 }, 2000)).toBe('contradicted');
    expect(judge({ comparator: 'more_than', value: 3538 }, 1769)).toBe('contradicted');
    expect(judge({ comparator: 'less_than', value: 2000 }, 1769)).toBe('consistent');
  });
});

describe('content security policy (B17)', () => {
  const csp = contentSecurityPolicy('abc', {
    dev: false,
    supabaseUrl: 'https://x.supabase.co',
    rpcUrl: null,
  });

  it('allows scripts only with the nonce and never inline', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('forbids framing and plugins', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('redirect targets after sign-in', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/hi/account', '/en')).toBe('/hi/account');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '', null])(
    'rejects %s',
    (value) => {
      expect(safeNext(value, '/en')).toBe('/en');
    },
  );
});
