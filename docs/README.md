# ElectraLens — Planning Docs

ElectraLens makes electoral-roll changes auditable, explainable and accessible without taking a political side. It is independent and **not affiliated with the Election Commission of India**.

| # | Document | What's in it |
|---|---|---|
| 1 | [01-PRD.md](01-PRD.md) | Problem, what ElectraLens is and isn't, constraints, users, stories, functional and non-functional requirements, scope, acceptance criteria, metrics |
| 2 | [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Electoral process mapping, zero-cost stack evaluation, diagrams, components, data tiers, data flows, integrity design, audit engine, auth model, data model, API overview, trust boundaries, failure handling, deployment, repo layout |
| 3 | [03-THREAT-MODEL.md](03-THREAT-MODEL.md) | 25 threats with prevent/detect/recover/residual, security test plan, privacy-by-design review, disclosure control, responsible AI |
| 4 | [04-ROADMAP.md](04-ROADMAP.md) | Hackathon MVP stages, 24-hour schedule, cut list, pilot, institutional work, **decisions needed (D1–D10)** |
| 5 | [05-TECHNICAL-ARCHITECTURE.md](05-TECHNICAL-ARCHITECTURE.md) | Pinned stack, services, repo layout, schemas, database design, API routes, and the **219-item build checklist** with full traceability |

Status: **draft for approval. No code yet.**

## Verified facts and sources

Checked on 2026-10-27. "Secondary" means news or third-party summaries rather than the primary official document. Check those against the official source before quoting them in the pitch.

| Fact | Source |
|---|---|
| SIR phases: Bihar 2025, phase II from Nov 2025, phase III announced May 2026; Delhi draft roll 5 Aug 2026, final roll 7 Oct 2026 | [CEO Delhi schedule](https://ceodelhi.gov.in/PDFFolders/2026/Schedule_of_Special_Intensive_Revision15May2026.pdf), [Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/eci-announces-phase-3-of-sir/print_manually), [Deccan Herald](https://www.deccanherald.com/amp/story/india%2Fnearly-65-crore-electors-removed-from-draft-rolls-of-12-states-uts-in-sir-phase-2-3854368) (secondary) |
| SIR appeals go to the District Magistrate, then the CEO | [West Bengal CEO press note](https://wbceo.wb.gov.in/Downloads/SIR2026/SIR_PressNote/CEO%20PN%2025_28.10.2025.pdf) |
| Four qualifying dates (1 Jan, 1 Apr, 1 Jul, 1 Oct), effective 1 Aug 2022 | [CEO Delhi press release](https://ceodelhi.gov.in/PDFFolder/PN-Press%20Release-01.08.2022.pdf), [PRS](https://prsindia.org/billtrack/the-election-laws-amendment-bill-2021) |
| Cap of 1,200 electors per polling station (2025) | [DT Next](https://www.dtnext.in/news/tamilnadu/election-commission-fixes-1200-cap-on-voters-per-booth), [Goa DIP](https://dip.goa.gov.in/ecis-new-initiatives/) (secondary) |
| ECINET launched Jan 2026, merging 40+ ECI apps | [IANS](https://ianslive.in/ecinet-app-records-10-crore-downloads-till-date-witnessed-983-crore-hits-on-polling-day--20260506191504), [Daily Pioneer](https://www.dailypioneer.com/news/new-eci-platform-launched) (secondary) |
| DPDP Rules notified Nov 2025, phased over ~18 months | [The Week / PTI](https://www.theweek.in/wire-updates/business/2025/11/14/del148-biz-dpdp-rules-ld-govt.html), [Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-) (secondary) |
| Supabase Free: 500 MB DB, 1 GB storage, 50k MAU, paused after 1 week inactive, no automatic backups; basic MFA included | [Supabase pricing](https://supabase.com/pricing) |
| Custom Access Token hook available on Free | [Supabase auth hooks](https://supabase.com/docs/guides/auth/auth-hooks) |
| RBAC via custom claims; MFA `aal2` claim | [Supabase RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) |
| Default Supabase SMTP: 2 messages/hour, team members only | [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| Cloudflare Free: one rate-limiting rule, free managed ruleset only | [Cloudflare WAF](https://developers.cloudflare.com/waf/) |
| Cloudflare partial (subdomain-only) setup needs Business or Enterprise | [Cloudflare partial setup](https://developers.cloudflare.com/dns/zone-setups/partial-setup/) |
| Turnstile Free: unlimited challenges, 20 widgets | [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) |
| Sepolia recommended for app development, Hoodi for validators, Holesky deprecated Sep 2025 | [ethereum.org networks](https://ethereum.org/en/developers/docs/networks/) |
| OpenTimestamps calendars are free and need no API key | [opentimestamps.org](https://opentimestamps.org/), [opentimestamps-client](https://pypi.python.org/pypi/opentimestamps-client) |
| Gemini API free tier: limits changed in 2026; free-tier content may be used to improve Google products | [agentdeals.dev](https://agentdeals.dev/gemini-api-pricing-changes), [CostBench](https://www.costbench.com/software/llm-api-providers/google-gemini-api/free-plan/) (secondary; check Google's terms) |

## Still unverified (check before relying on them)

- Whether background database queries keep a Supabase free project from pausing.
- Your VPS's RAM and CPU, and whether your domain's DNS is on Cloudflare.
- Supabase Postgres major version (for `pg_dump` client matching).
- The final text of the 2025 ECI order on the 1,200-elector cap.
- How browser speech recognition handles audio for Hindi and the third language (it may use a cloud service, depending on the browser).
- The current free-tier terms of any LLM provider we might use.
- The organisers' official judging criteria.
