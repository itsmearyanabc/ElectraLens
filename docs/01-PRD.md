# ElectraLens — Product Requirements Document

| | |
|---|---|
| Version | 0.1 (draft for founder approval) |
| Date | 2026-10-27 |
| Owner | Aryan Yadav |
| Track | PS 1 — AI for Electoral Roll Transparency |
| Build window | 24-hour hackathon, built to production-grade standards |
| Status | Planning. No code yet. |

**Conventions used in all ElectraLens docs**

- **[V]** verified against a source listed in [README.md](README.md#verified-facts-and-sources). **[A]** assumption that still needs checking. **[P]** proposal (a design choice, not a fact).
- Priority: **P0** = hackathon must-have, **P1** = hackathon should-have, **P2** = zero-cost pilot, **P3** = needs official cooperation, legal review or money.
- Requirement IDs (`FR-…`, `NFR-…`, `AC-…`) stay stable across all later stages.

---

## 1. Problem

Electoral rolls decide who can vote. They are large, published in formats that are hard to analyse, and revised often. Revisions can add or remove millions of names. Since mid-2025 India has run Special Intensive Revisions (SIR) in phases (Bihar first, a second phase from November 2025, a third announced for 2026), and draft-roll changes have been reported in crores of names [V]. Citizens can't easily tell what changed or why. Journalists and observers lack tools to audit at scale, and claims spread faster than anyone can check them.

ElectraLens makes roll changes **auditable, explainable and accessible**, without taking a political side.

## 2. What ElectraLens is, and what it is not

| ElectraLens **is** | ElectraLens **is not** |
|---|---|
| An independent civic-tech tool with open methodology | An Election Commission system or anything endorsed by ECI |
| A way to compare roll versions and surface statistical anomalies for human review | A fraud detector. An anomaly is a reason to look closer, not proof of anything. |
| A publisher of aggregate, privacy-reviewed evidence with tamper-evident integrity proofs | A source of official voter status or a replacement for the ERO's claims-and-objections process |
| An information companion that links citizens to official ECI services | A voter-ID issuer or a substitute for identity checks at the polling station |
| A claim checker that says what the published data can and cannot establish | A judge of whether an election is legitimate |

**Core principle:** public data, public methodology, public evidence, private identities.

## 3. Hard constraints

| ID | Constraint | Consequence |
|---|---|---|
| C1 | **Zero spend.** Existing Hostinger VPS, Supabase free tier, a subdomain of an existing domain, testnets only. | Every component must run on free tiers or self-hosted open source. Free-tier limits become design inputs (see Architecture §2). |
| C2 | **Synthetic data only** for the hackathon (organiser rule). | A synthetic roll generator with injected, labelled anomalies is a P0 component, not a side tool. |
| C3 | **Neutrality rules** (organiser rule): never declare fraud from an anomaly, never name individuals, parties or institutions, explain reasoning and uncertainty, apply the same standards everywhere. | Enforced in code (rule catalogue, banned-term filter, no party data), not only in the UI copy. |
| C4 | No personal data on-chain. Public pages need no account. | Integrity layer stores hashes only; public portal is anonymous. |
| C5 | The VPS already serves another production app behind host nginx. | ElectraLens binds to localhost ports, gets its own nginx server block and container resource limits, and must not disrupt the other app. |
| C6 | Organiser deliverables: working prototype, live demo on test data, and a 45–90 second promo video. | Demo script and video are planned deliverables (Roadmap, stage S9). |
| C7 | **24-hour build window**, with production-level quality expected. | Only P0 is committed. P1 is a stretch goal. "Production level" here means production-grade foundations: real deployment, RLS, staff MFA, secrets hygiene, hardened containers, backups, audit log, and automated tests for integrity and access control. It does not mean a certified service. Work that needs time to mature (independent security test, accessibility audit, repeated restore drills) moves to the pilot, and we say so openly. |

## 4. Users

| Persona | Needs | Account? |
|---|---|---|
| **Citizen** (often mobile, low bandwidth, Hindi-first) | "What changed in my area?" "How do I check my name?" "Where is my booth?" "Is this WhatsApp claim true?" | No. Optional for saved items and alerts. |
| **Journalist / fact-checker** | Citable evidence, methodology, downloadable aggregates, a way to verify that a report wasn't altered | No |
| **Observer / researcher** | Version-to-version comparisons at scale, reproducible results, raw aggregate exports | No |
| **ElectraLens staff**: data steward, analyst, reviewer, publisher, security auditor, system admin | Controlled workflows with separation of duties | Yes, invite-only, MFA required |
| **Election official** (future) | Read-only view of findings in their jurisdiction to investigate or correct | P3, needs a formal arrangement |
| **Hackathon judge** | See the full pipeline work live in a few minutes | No |

## 5. User stories

**Citizen**
- US-C1 As a citizen I can see, without signing up, how many names were added, deleted or corrected in my constituency between two roll versions.
- US-C2 I can read a plain-language explanation of any flagged pattern, including innocent explanations, in Hindi, English or a third language.
- US-C3 I can scan a QR code on a poster and see my polling station's details, where they came from and when they were last verified.
- US-C4 I am sent to the official ECI service to check my own registration or apply for inclusion, correction or deletion. ElectraLens never pretends to be that service.
- US-C5 I can paste or type a claim ("50% of voters were deleted in X") and get a verdict: consistent with the published data, contradicted by it, or not something this data can establish.
- US-C6 I can optionally create an account to save reports and booths and get alerts when a dataset I follow changes.
- US-C7 I can ask simple questions by voice where my browser supports it.

**Journalist / observer**
- US-J1 I can download the aggregate tables and the report behind any finding.
- US-J2 I can verify, in my own browser, that a downloaded report matches the hash anchored on a public blockchain at publication time.
- US-J3 I can read the exact methodology version, thresholds and code version used for a run.
- US-J4 I can see the publication history, including corrections and retractions, which are never silently deleted.

**Staff**
- US-S1 (Data steward) I can upload a permitted dataset, record its provenance, and see a validation report. Bad files are quarantined.
- US-S2 (Analyst) I can run an audit comparing two approved versions and inspect findings with row-level evidence inside the restricted workspace.
- US-S3 (Reviewer) I can accept, downgrade or reject each finding with a reason, and I cannot review a run I created.
- US-S4 (Publisher) I can publish a reviewed report only after a second, different person has approved it. Publishing triggers integrity anchoring.
- US-S5 (Publisher) I can issue a correction or retraction that creates a new version linked to the old one.
- US-S6 (Security auditor) I can read the audit log and security events but cannot change data.
- US-S7 (System admin) I can invite staff, assign scoped roles and revoke access immediately. I cannot publish on my own.

**Judge**
- US-D1 I can watch: generate a synthetic roll, run an audit, open a finding, verify its integrity proof, tamper with one record, and watch verification fail.

## 6. Functional requirements

### M1. Data ingestion

| ID | Requirement | Pri |
|---|---|---|
| FR-ING-1 | Accept only CSV or Parquet files that match a declared, versioned schema (`electoral_roll_v1`, `polling_stations_v1`). Reject anything else. Size limit is configurable (default 50 MB). | P0 |
| FR-ING-2 | Record provenance: source, permission basis (synthetic / public / authorised), retrieval URL and time, uploader, original file SHA-256. | P0 |
| FR-ING-3 | Validate types, ranges, required fields, enum codes and referential integrity (every part number exists in `jurisdictions`). | P0 |
| FR-ING-4 | Quarantine invalid files with a machine-readable ingestion report. Never auto-delete them. | P0 |
| FR-ING-5 | Classify columns as direct identifiers, quasi-identifiers or non-identifying. Direct identifiers never leave the restricted tier. | P0 |
| FR-ING-6 | Produce the canonical form and its Merkle root (see Architecture §8) so the same data always gives the same commitment. | P0 |
| FR-ING-7 | Keep the original file and checksum read-only in private storage. | P0 |
| FR-ING-8 | No URL-based import in the MVP (it opens SSRF risk). If added later, only allow-listed hosts. | P2 |
| FR-ING-9 | Stewards approve a validated version before analysts can use it. | P1 |

### M2. Audit engine

| ID | Requirement | Pri |
|---|---|---|
| FR-AUD-1 | Synthetic roll generator: realistic structure (state → district → assembly constituency → part), Indian-style names in Devanagari and Latin, ages, genders, house numbers, relative names, multiple versions over time, deletion reason codes. Injects labelled anomalies with a seed. | P0 |
| FR-AUD-2 | Version diff: additions, deletions, corrections, per part and constituency, with deletion reasons where present. | P0 |
| FR-AUD-3 | Deterministic rules (catalogue in Architecture §9): exact and likely duplicates, impossible ages, age inconsistent across versions, abnormal deletion or addition rate, high-occupancy addresses, gender-ratio shift, missing or invalid fields. | P0 |
| FR-AUD-4 | Rate checks use a stated statistical test against a stated baseline, with false-discovery-rate control across parts and a minimum effect size. | P0 |
| FR-AUD-5 | Every finding carries: ID, dataset versions, rule and version, evidence, baseline, threshold, plain-language explanation, alternative explanations, signal strength with uncertainty, limitations, review status. | P0 |
| FR-AUD-6 | Runs are reproducible: same inputs, code version and parameters give byte-identical outputs. The run records all three. | P0 |
| FR-AUD-7 | Detection quality is measured against the injected anomalies (precision and recall per rule) and shown on the methodology page. | P1 |
| FR-AUD-8 | ML methods (for example Isolation Forest) are added only if they beat the rules on the measured benchmark. | P2 |
| FR-AUD-9 | Every run covers every part in the dataset. Nobody picks which areas get analysed, so the tool can't be used to cherry-pick. | P0 |

### M3. Explanations

| ID | Requirement | Pri |
|---|---|---|
| FR-EXP-1 | Explanations are generated from the finding's evidence JSON using reviewed templates in English, Hindi and one more language. No network or LLM needed. | P0 |
| FR-EXP-2 | Each finding type has a curated list of innocent explanations (migration, death-record catch-up, part reorganisation, duplicate clean-up drive, house-to-house revision, data-entry batching). | P0 |
| FR-EXP-3 | Optional LLM rephrasing or Q&A only sees public evidence JSON. Its output is checked: every number and place must appear in the evidence, banned terms are blocked, and it falls back to the template on any failure. Off by default. | P1 |
| FR-EXP-4 | Generated text never uses accusatory terms ("fraud", "rigged", "stolen", "fake voters") or names parties, candidates or people. | P0 |

### M4. Public transparency portal

| ID | Requirement | Pri |
|---|---|---|
| FR-PUB-1 | Home: published datasets, latest revision summary, what ElectraLens is and isn't. No login. | P0 |
| FR-PUB-2 | Version comparison page: additions, deletions and corrections by area, with charts and a table. | P0 |
| FR-PUB-3 | Findings list and finding detail page (evidence, baseline, explanation, alternatives, uncertainty, review status). | P0 |
| FR-PUB-4 | Methodology page: rules, thresholds, statistical tests, versions, known limitations, measured detection quality. | P0 |
| FR-PUB-5 | Verification page: recompute a report's hash in the browser and compare it with the on-chain record read directly from a public RPC, so the check doesn't depend on our server. | P0 |
| FR-PUB-6 | Provenance and publication history, including corrections and retractions. | P0 |
| FR-PUB-7 | Every piece of content carries a label: *Source data*, *Analytical finding*, *User-submitted claim*, *Unverified / inconclusive*, *Confirmed correction*. | P0 |
| FR-PUB-8 | Aggregate downloads (CSV and JSON), each with its hash. | P1 |
| FR-PUB-9 | Small-cell suppression on every public breakdown (Threat model §5.3). | P0 |
| FR-PUB-10 | Links to official ECI services, clearly marked as external and official. | P0 |

### M5. Claim checker

| ID | Requirement | Pri |
|---|---|---|
| FR-CLM-1 | A structured claim form (area, metric, period, value, direction). | P0 |
| FR-CLM-2 | Optional free-text input, parsed into the structured form by an LLM. The user confirms the parsed form before evaluation. | P1 |
| FR-CLM-3 | The verdict is computed by code against published aggregates, never by an LLM. Verdicts: **Consistent with published data**, **Contradicted by published data**, **Disputed** (published sources disagree), **Cannot be established from available data**. | P0 |
| FR-CLM-4 | Claims about intent, fraud or wrongdoing always get "Cannot be established from this data", with an explanation of why. | P0 |
| FR-CLM-5 | Submissions are protected by Turnstile and rate limits. Claims are only published after moderation. | P1 |

### M6. Citizen assistant

| ID | Requirement | Pri |
|---|---|---|
| FR-AST-1 | Guided flows: check my registration (link-out), apply or correct (link-out to the official forms), find my booth, understand a change, check a claim. | P0 |
| FR-AST-2 | English, Hindi and one more language for the whole UI and all templates. Translations reviewed by a fluent speaker. | P0 |
| FR-AST-3 | Voice input and output through the browser's speech APIs, where available, with a privacy notice. | P1 |
| FR-AST-4 | Free-text Q&A grounded only in published content and the official-links catalogue. | P2 |

### M7. Integrity layer

| ID | Requirement | Pri |
|---|---|---|
| FR-INT-1 | Deterministic canonicalisation (RFC 8785 JSON, NFC, fixed ordering) and SHA-256 Merkle roots (RFC 6962 construction). | P0 |
| FR-INT-2 | One publication manifest per publication, linking dataset roots, run, parameters, report hash, aggregates hash and the previous manifest. | P0 |
| FR-INT-3 | Append-only Solidity registry on an Ethereum testnet: anchor, retract (a new event, never a delete), no overwrite, role-based publishing. | P0 |
| FR-INT-4 | OpenTimestamps proof of the same manifest hash (free, anchored in Bitcoin). | P1 |
| FR-INT-5 | Verification returns match or mismatch, plus transaction, block, time and the manifest diff. | P0 |
| FR-INT-6 | A tamper demo mode, on synthetic data only. | P0 |
| FR-INT-7 | Identical canonicalisation in Python and TypeScript, with shared test vectors. | P0 |

### M8. Polling booths and QR codes

| ID | Requirement | Pri |
|---|---|---|
| FR-QR-1 | Booth page `/b/{public_code}`: station name, address, parts served, accessibility notes, source, last verified time, official links. | P0 |
| FR-QR-2 | The QR code holds only the booth page URL with a random public code. No personal data, credentials or tokens. | P0 |
| FR-QR-3 | Printable QR posters per booth or ward, with a "not an official document" notice. | P1 |
| FR-QR-4 | Booth data goes through ingestion and approval like any dataset. Synthetic booths are watermarked "DEMO — fictional". | P0 |
| FR-QR-5 | No per-voter QR codes. | P0 (exclusion) |

### M9. Accounts

| ID | Requirement | Pri |
|---|---|---|
| FR-ACC-1 | Citizen sign-in with Supabase Auth: Google OAuth and email magic link. Never EPIC number as a login or password. | P1 |
| FR-ACC-2 | Citizen data is limited to display name (optional), language and notification preferences, saved items and subscriptions. | P1 |
| FR-ACC-3 | Self-service account deletion that removes all citizen data. | P1 |
| FR-ACC-4 | Staff accounts are invite-only. Roles are granted only by a system admin, through the API, never via signup metadata. | P0 |
| FR-ACC-5 | Staff must use TOTP MFA. Staff data access is enforced by RLS that requires `aal2`. | P0 |
| FR-ACC-6 | Roles can be scoped to a jurisdiction. Revoking a role takes effect on the next request. | P1 |

### M10. Operations console and governance

| ID | Requirement | Pri |
|---|---|---|
| FR-GOV-1 | Separate workspaces for steward, analyst, reviewer, publisher, auditor and admin. | P0 (steward, analyst, reviewer, publisher), P1 (rest) |
| FR-GOV-2 | Two-person rule, enforced in the database: a publication needs a reviewer approval and a publisher approval from two different people, neither of whom created the run. | P0 |
| FR-GOV-3 | Append-only audit log of security-relevant actions (actor, time, action, target, reason). UPDATE and DELETE are revoked at the database level. | P0 |
| FR-GOV-4 | Corrections and retractions create new linked versions. Nothing is silently deleted. | P0 |
| FR-GOV-5 | Job dashboard (ingest, analyse, publish, anchor) with status and retry. | P1 |
| FR-GOV-6 | Incident records and security event views. | P2 |

## 7. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-1 | Privacy | No direct identifiers in any public table, API response, file, log line, LLM prompt or on-chain value. An automated PII scan of public API responses runs in CI. |
| NFR-2 | Security | Least privilege at every layer. Secrets only on the server. RLS on every table. Staff MFA. Layered defences, with no claim of "unhackable". |
| NFR-3 | Neutrality | Same rules and thresholds for every area. No party, candidate or vote-share data is ingested. Methodology is versioned and public before results. |
| NFR-4 | Reproducibility | Deterministic engine, pinned dependencies, recorded code version and container digest, golden-output tests. |
| NFR-5 | Performance | Public pages are server-rendered and cacheable. Target under 2.5 s Largest Contentful Paint on a mid-range phone over 4G for cached pages [P]. Audit run on a 200k-row synthetic roll in under 2 minutes on the VPS [A, depends on VPS size]. |
| NFR-6 | Availability | Single-VPS best effort, with no SLA claims. Public pages degrade to cached content if Supabase is unreachable. |
| NFR-7 | Accessibility | Target WCAG 2.2 AA: keyboard navigation, contrast, screen-reader labels, charts with table alternatives. |
| NFR-8 | Localisation | All UI strings and templates externalised. No machine-only translation of civic content without human review. |
| NFR-9 | Low bandwidth | Public pages usable on 2G/3G. Minimal client JavaScript on public routes. |
| NFR-10 | Cost | ₹0 per month in recurring spend (C1). |
| NFR-11 | Observability | Structured logs without PII, health endpoints, uptime checks, job failure alerts. |
| NFR-12 | Maintainability | Monorepo, typed contracts shared between services, tests for security and integrity properties. |
| NFR-13 | Legal posture | Not an official system. Visible disclaimer. Real voter data needs legal review first. DPDP Act obligations apply to citizen accounts (Threat model §5.5). |

## 8. Scope

**In scope for the hackathon MVP** (committed: every P0 requirement; stretch: P1 requirements, in the order of the Roadmap cut list)
Synthetic data pipeline, audit engine, template explanations in three languages, public dashboard, comparison, finding detail, methodology, browser-side verification with tamper demo, testnet registry, booth pages with QR codes on synthetic booths, structured claim checker, guided assistant, minimal staff console with the two-person publish rule, deployment on the subdomain.

**Explicit exclusions**
- Real voter data of any kind during the hackathon.
- Scraping, automating or proxying official ECI portals. They are bot-protected and intended for interactive use. ElectraLens links out instead.
- Per-voter lookups, per-voter QR codes, EPIC-based login.
- Party, candidate, vote-share or turnout data.
- Any automated "fraud" or legitimacy verdict.
- Mainnet anchoring, paid APIs, paid tiers (C1).
- Anything that presents ElectraLens as official.

## 9. Acceptance criteria (hackathon MVP)

| ID | Criterion |
|---|---|
| AC-1 | From a clean state, the live demo goes from "generate synthetic roll" to "tamper detected" in under 5 minutes with no manual database edits. |
| AC-2 | Running the same audit twice on the same inputs gives identical output hashes (automated test). |
| AC-3 | The CI PII scan finds no names, relative names, house numbers or synthetic EPIC-format strings in any public API response or published file. |
| AC-4 | RLS tests prove that anonymous users read only published rows, citizens read only their own rows, and staff without `aal2` read nothing restricted. |
| AC-5 | A test proves a publication can't reach `approved` with one approver, with the run's creator as approver, or with two approvals from the same person. |
| AC-6 | Changing one character in one record changes the dataset root, and the verification page shows a mismatch together with the original anchor transaction. |
| AC-7 | Python and TypeScript canonicalisers produce identical hashes for every shared test vector, including Devanagari, empty fields and reordered rows. |
| AC-8 | Precision and recall per rule on the injected-anomaly benchmark are computed and displayed. No target is claimed until measured. |
| AC-9 | Each finding page shows evidence, baseline, threshold, explanation, at least two alternative explanations, uncertainty and review status in all three languages. |
| AC-10 | The banned-term test passes on every template and on LLM output when the LLM is enabled. |
| AC-11 | Every QR code decodes to `https://<subdomain>/b/<code>` with nothing else in it. |
| AC-12 | The claim checker returns each of the four verdict types on prepared test claims, and intent or fraud claims return "Cannot be established". |

## 10. Success metrics

No traction is claimed before it exists. These are the measures we will report honestly.

**Hackathon:** AC-1 to AC-12 pass. The demo runs live, not from a recording.
**Pilot (after the hackathon):** number of published reports; number of independent verifications (browser verifier runs, counted without personal data); median time from dataset approval to published report; share of findings reviewed within 7 days; claims checked per month; accessibility audit score; PII incidents (target: zero, reported publicly if any).

## 11. Open questions

These are tracked as decisions D1–D10 in [04-ROADMAP.md](04-ROADMAP.md#7-decisions-needed-from-you).
