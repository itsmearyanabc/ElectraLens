# ElectraLens — Frontend routes and design

Every page and route handler of `apps/web`, who may open it, where its data comes from and how it renders. The build checklist items it serves are in [05-TECHNICAL-ARCHITECTURE.md](05-TECHNICAL-ARCHITECTURE.md) §8–9 (B09–B15).

## 1. Conventions

- **Languages.** Every page except the QR booth pages and route handlers lives under a locale prefix: `/en` (default) and `/hi`. A third language (decision D4) is one messages file and one entry in `i18n/routing.ts`. `/` redirects using the `NEXT_LOCALE` cookie, then `Accept-Language`.
- **Access.**
  - *Public:* anyone; reads go to Supabase as `anon`, so RLS and column grants decide what is visible.
  - *Citizen:* signed in (magic link or Google).
  - *Staff:* signed in **and** `aal2` (TOTP) **and** the role named in the table. The page only hides what the role can't use; the database functions and RLS enforce it.
- **Rendering.**
  - *ISR 60 s:* public data is cached for 60 seconds in the Next.js data cache. The HTML itself is rendered per request, because every page carries a fresh CSP nonce (B17).
  - *Dynamic:* rendered per request with the user's session.
  - *Island:* a server page with one client component for the part that must run in the browser.
- **IDs in URLs.** Findings, publications, datasets, runs and claims use their UUID (finding codes are unique only within a run). Methodology uses its version (`2026.1`). Booths use their 10-character public code.
- **Query strings** carry filters and drill-down state only, never personal data (Privacy rule). Booth and QR requests are never tied to an account.

## 2. Public pages

| # | Path | Page | Data | Render |
|---|---|---|---|---|
| P01 | `/{locale}` | Home: what ElectraLens is and isn't, latest publication, headline revision numbers, entry points (verify, findings, check a claim, find a booth) | publications, aggregate_metrics | ISR 60 s |
| P02 | `/{locale}/datasets` | Dataset versions: source, permission basis, qualifying date, roll stage, rows, Merkle root, synthetic flag | dataset_versions, data_sources, jurisdictions | ISR 60 s |
| P03 | `/{locale}/datasets/{id}` | One version: provenance, root, row count, runs that used it, download of synthetic files | same + audit_runs | ISR 60 s |
| P04 | `/{locale}/compare` | Revision comparison `?area=&run=`: additions, deletions by reason, corrections, net change; bar charts with data tables; drill-down state → district → constituency → part; "< 10" suppression | aggregate_metrics, jurisdictions | ISR 60 s |
| P05 | `/{locale}/findings` | Findings list `?rule=&area=&strength=&review=&run=&cursor=`: per-run counts, including findings rejected in review | anomaly_findings | ISR 60 s |
| P06 | `/{locale}/findings/{id}` | Finding: evidence, baseline, criterion, signal strength with interval, explanation, **alternative explanations as prominent as the evidence**, limitations, review status, label, permalink, share | anomaly_findings, methodology_versions | ISR 60 s |
| P07 | `/{locale}/methodology` | Redirects to the latest published version | methodology_versions | Dynamic (redirect) |
| P08 | `/{locale}/methodology/{version}` | Rules R01–R12, thresholds, statistical tests, what signal strength means, limitations, benchmark precision and recall | methodology_versions | ISR 60 s |
| P09 | `/{locale}/publications` | Every series and its sequence, with corrections, retractions and anchor status | publications, blockchain_anchors | ISR 60 s |
| P10 | `/{locale}/publications/{id}` | One publication: manifest, hashes, approval steps and times (no names), anchors, downloads with hashes, previous and superseding links | publications, publication_approvals, blockchain_anchors | ISR 60 s |
| P11 | `/{locale}/verify` | Pick a publication to verify, or check a manifest file you already have | publications | ISR 60 s + island |
| P12 | `/{locale}/verify/{id}` | Independent verification in the browser: recompute hashes, read the registry from a public Hoodi RPC, show MATCH / MISMATCH / ANCHOR PENDING / RETRACTED / NETWORK UNAVAILABLE, and what it does and doesn't prove | publications + public-artifacts + chain | ISR 60 s + island |
| P13 | `/{locale}/verify/{id}/tamper` | Tamper demo: change one record in a local copy and watch the root and the changed leaf. Synthetic publications only (404 otherwise) | public-artifacts | Island |
| P14 | `/{locale}/claims` | Claim checker: structured form → one of four verdicts with the exact numbers and a manifest link; optional submission for moderation | API `claims/check`, `claims` | Dynamic + island |
| P15 | `/{locale}/claims/{id}` | A moderated, published claim with its "User-submitted claim" label and verdict | claim_submissions, claim_assessments | ISR 60 s |
| P16 | `/{locale}/assistant` | Guided assistant `?step=`: check registration, apply or correct (Forms 6/7/8), find a booth, understand a change, check a claim. Voice where the browser supports it | static catalogue | ISR 60 s + island |
| P17 | `/{locale}/booths` | Booth search by area only `?area=` (there is no search by person) | polling_stations, jurisdictions | ISR 60 s |
| P18 | `/{locale}/official-links` | Official services (voter portal, Forms 6/7/8, roll search), marked external and official | static | ISR |
| P19 | `/{locale}/about` | What ElectraLens is and is not, independence, open methodology, synthetic demo data | static | ISR |
| P20 | `/{locale}/privacy` | Data inventory, what is never collected, retention periods | static | ISR |

## 3. QR booth pages (no locale prefix)

| # | Path | Page | Data | Render |
|---|---|---|---|---|
| Q01 | `/b/{code}` | Booth page reached from a QR code: name, address, parts served, accessibility, source, last verified, official links, "not an official document", DEMO watermark for synthetic booths. `?lang=hi` switches language | polling_stations | ISR 60 s |
| Q02 | `/b/{code}/poster` | Printable A4 poster: QR code (encoding only `https://<host>/b/<code>`), booth name and notice | polling_stations | ISR 60 s |

There is no per-voter QR route, and a test asserts it (B13.07).

## 4. Citizen account

| # | Path | Page | Access | Render |
|---|---|---|---|---|
| A01 | `/{locale}/account` | Overview, or redirect to sign-in | Citizen | Dynamic |
| A02 | `/{locale}/account/sign-in` | Email magic link and Google. No EPIC field anywhere | Public | Dynamic |
| A03 | `/{locale}/account/saved` | Saved publications, findings and booths | Citizen | Dynamic |
| A04 | `/{locale}/account/subscriptions` | Followed areas and series | Citizen | Dynamic |
| A05 | `/{locale}/account/claims` | Claims I submitted and their moderation status | Citizen | Dynamic |
| A06 | `/{locale}/account/settings` | Display name, language, email alerts, delete my account | Citizen | Dynamic |

## 5. Operations console (staff)

All `/ops` pages except sign-in and MFA need a staff role and `aal2`.

| # | Path | Page | Roles | Render |
|---|---|---|---|---|
| O01 | `/{locale}/ops/login` | Staff sign-in (email and password) | Public | Dynamic |
| O02 | `/{locale}/ops/mfa` | TOTP enrolment on first sign-in, challenge afterwards | Signed in | Dynamic |
| O03 | `/{locale}/ops` | Dashboard: my roles and scope, work waiting for me | Any staff | Dynamic |
| O04 | `/{locale}/ops/datasets` | Dataset versions in my scope and their status | Steward, analyst, reviewer | Dynamic |
| O05 | `/{locale}/ops/datasets/new` | New source and version, upload to quarantine | Steward | Dynamic |
| O06 | `/{locale}/ops/datasets/{id}` | Ingestion report, approve | Steward | Dynamic |
| O07 | `/{locale}/ops/runs` | Audit runs and their jobs | Analyst, reviewer, publisher | Dynamic |
| O08 | `/{locale}/ops/runs/new` | Start a run: baseline, target, methodology | Analyst | Dynamic |
| O09 | `/{locale}/ops/runs/{id}` | Run status, counts by rule, findings to review | Analyst, reviewer, publisher | Dynamic |
| O10 | `/{locale}/ops/findings` | Review queue (blocked on my own runs) | Reviewer, analyst | Dynamic |
| O11 | `/{locale}/ops/findings/{id}` | Finding, restricted evidence through a 5-minute signed URL, review with a reason | Reviewer, analyst | Dynamic |
| O12 | `/{locale}/ops/publications` | Publications in every state | Publisher, reviewer | Dynamic |
| O13 | `/{locale}/ops/publications/new` | Create a publication from a reviewed run | Publisher | Dynamic |
| O14 | `/{locale}/ops/publications/{id}` | Manifest and its diff from the previous one, approve the review or publish step, retract or correct with a reason | Publisher, reviewer | Dynamic |
| O15 | `/{locale}/ops/claims` | Claim moderation: publish or reject with a reason | Reviewer | Dynamic |
| O16 | `/{locale}/ops/booths` | Booth imports and publishing | Steward | Dynamic |
| O17 | `/{locale}/ops/methodology` | Methodology versions; new draft | Analyst, publisher | Dynamic |
| O18 | `/{locale}/ops/methodology/{version}` | Parameters, freeze, publish (a different person from the author) | Analyst, publisher | Dynamic |
| O19 | `/{locale}/ops/staff` | Staff, scoped roles, grant and revoke | Sysadmin | Dynamic |
| O20 | `/{locale}/ops/staff/invite` | Invite a staff member | Sysadmin | Dynamic |
| O21 | `/{locale}/ops/audit` | Audit log, read-only, with filters | Auditor, sysadmin | Dynamic |
| O22 | `/{locale}/ops/security` | Security events and incidents | Auditor, sysadmin | Dynamic |
| O23 | `/{locale}/ops/jobs` | Job queue: status, attempts, errors, retry | Any staff | Dynamic |

## 6. Route handlers and system routes

| # | Path | Purpose |
|---|---|---|
| S01 | `/` | Redirect to the visitor's language |
| S02 | `/auth/callback` | OAuth code exchange, then redirect to a same-site `next` path only |
| S03 | `/auth/confirm` | Magic-link `token_hash` verification |
| S04 | `/auth/sign-out` | `POST` only; clears the session |
| S05 | `/{locale}/findings/{id}/opengraph-image` | Share card that carries the disclaimer with the finding |
| S06 | `/robots.txt` | Disallows `/ops`, `/account` and `/auth` |
| S07 | `/sitemap.xml` | Public pages in every language |
| S08 | `/manifest.webmanifest`, `/icon.svg` | App manifest and icon |
| S09 | `/healthz` | Liveness for the container |
| S10 | not-found, error | Localised 404 and error pages that never show stack traces |

## 7. Design

The theme is **orange, white and blue**. White carries the content, blue carries trust and navigation, saffron orange marks what to look at.

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `navy` | `#0A2A66` | Header, footer, headings | 13.7 : 1 with white |
| `blue` | `#1546B0` | Links, primary buttons, focus outline | 8.3 : 1 with white |
| `blue-tint` | `#EAF1FD` | Selected rows, info panels | blue on it 7.3 : 1 |
| `saffron` | `#FF9933` | Accent fills, the top stripe, highlights, secondary buttons (navy text) | navy on it 6.4 : 1 |
| `orange-ink` | `#C2410C` | Orange text (eyebrows, warnings) | 5.2 : 1 with white |
| `saffron-tint` | `#FFF4E8` | Alternative-explanation panels, notices | `#9A3412` on it 6.7 : 1 |
| `ink` | `#0F1B33` | Body text | 17.1 : 1 with white |
| `muted` | `#4A5873` | Secondary text | 7.2 : 1 with white |
| `mist` | `#F4F7FC` | Section backgrounds | muted on it 6.7 : 1 |

- Saffron is never used as text on white (2.4 : 1). Every pair above meets WCAG AA.
- One typeface, Mukta, covers Latin and Devanagari so English and Hindi pages match. Hashes use the system monospace font.
- The "Independent — not affiliated with the Election Commission of India" notice sits in the header on every page. With national colours it matters even more that nobody mistakes the site for an official one.
- Signal strength and content labels always pair colour with text, never colour alone.
