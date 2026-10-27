# ElectraLens — Threat Model and Privacy-by-Design Review

Version 0.1 · 2026-10-27 · Draft for approval. Component and boundary names (TB1–TB10) as in [02-ARCHITECTURE.md](02-ARCHITECTURE.md).

No single control here makes the system secure. Cloudflare, RLS, encryption and blockchain are each one layer. The plan assumes every layer can fail and asks what the next one catches.

## 1. Scope and assets

| Asset | Why it matters |
|---|---|
| A1 Restricted row-level data and salts | Personal data in a real deployment. Leaking it is the worst outcome. |
| A2 Publication integrity (what was published, and when) | The product's credibility |
| A3 Neutrality and accuracy of public findings | A wrong or slanted finding can mislead voters and be weaponised |
| A4 Staff accounts and roles | The route to A1–A3 |
| A5 Anchor publisher key | Can append to the public record |
| A6 Supabase service-role key | Bypasses RLS |
| A7 Citizen accounts (email, saved items) | Personal data under the DPDP Act |
| A8 Availability during roll-revision periods | Peak interest is exactly when attacks are likely |
| A9 The other app on the same VPS | Shared blast radius (TB10) |

## 2. Adversaries

- **Partisan actors** of any side who want either to suppress inconvenient findings or to manufacture "proof" of wrongdoing.
- **Scrapers and data brokers** after personal data.
- **Opportunistic attackers:** credential stuffing, scanners, bots.
- **Malicious or careless insiders:** staff with legitimate access.
- **Misinformation spreaders** who screenshot or misquote outputs out of context.
- **Supply-chain attackers:** compromised npm or PyPI packages, Docker images.

## 3. Threats

Format: **Scenario** · **Impact** · **Prevent** · **Detect** · **Recover** · **Residual risk** (L/M/H).

**T01 Unauthorised staff access**
- Scenario: a citizen signs up and tries to reach staff routes, or edits `user_metadata` to claim a role.
- Impact: access to A1/A3.
- Prevent: roles come only from `staff_assignments`, written only by the admin workflow; RLS requires `has_role()` **and** `aal2`; staff routes check again server-side; there is no role field in signup.
- Detect: `security_events` on 403s to staff routes; alert on repeats.
- Recover: revoke sessions, review the audit log.
- Residual: **L**.

**T02 Compromised administrator account**
- Scenario: phished password, or a stolen session cookie.
- Impact: role escalation, invites for attacker accounts.
- Prevent: mandatory TOTP; sysadmin **cannot** publish or review (separation of duties); every role grant is logged and emailed to all admins; short staff sessions.
- Detect: alert on role grants, new MFA factor enrolment, logins from new locations.
- Recover: revoke the factor and sessions from a second admin; rotate the service-role key if exposure is suspected; audit everything since the compromise.
- Residual: **M** (a single founder-admin is a real gap until there are two admins).

**T03 Malicious or malformed dataset upload**
- Scenario: CSV injection (`=HYPERLINK(...)`), decompression bombs, a huge file, a hostile Parquet file, path tricks in file names.
- Impact: worker crash or resource exhaustion; formula execution when staff open exports in Excel.
- Prevent: allow-listed types, size limits, schema-first parsing (Polars with explicit dtypes), server-generated storage paths, worker runs non-root and read-only with memory and time limits, CSV exports escape leading `= + - @` characters.
- Detect: quarantine reports; job failure alerts.
- Recover: delete the quarantined object (logged); fix the parser and retry.
- Residual: **L**.

**T04 SQL injection**
- Scenario: crafted filters on public endpoints.
- Impact: data exposure.
- Prevent: the Supabase client and parameterised queries only; no string-built SQL; RLS limits damage even if injection happened; database functions use `set search_path = ''`.
- Detect: WAF managed rules (free set); error-rate alerts.
- Recover: patch, review logs.
- Residual: **L**.

**T05 Broken authorisation / IDOR**
- Scenario: `GET /me/saved/{id}` returns another user's row; an analyst reads another jurisdiction's restricted evidence.
- Impact: privacy breach.
- Prevent: RLS `user_id = auth.uid()` and jurisdiction scoping; the API uses the user's JWT, not the service role, for user data; random UUIDs; pgTAP tests for every policy (PRD AC-4).
- Detect: tests in CI; 403 and 404 anomaly monitoring.
- Recover: hotfix the policy; notify affected users if exposure is confirmed.
- Residual: **L–M** (until the policy tests are complete).

**T06 Cross-site scripting**
- Scenario: a malicious claim text, dataset field or translation string rendered as HTML.
- Impact: session theft, especially of staff sessions.
- Prevent: React escaping; no `dangerouslySetInnerHTML` on user content; strict CSP with nonces; httpOnly cookies; templates interpolate values as text only.
- Detect: CSP violation reports; lint rule bans raw HTML.
- Recover: patch, rotate staff sessions.
- Residual: **L**.

**T07 CSRF**
- Scenario: a third-party page triggers state changes using a logged-in user's cookies.
- Impact: unwanted saves or subscriptions; staff actions in the worst case.
- Prevent: the API only accepts bearer tokens (no cookie auth); web server actions check `Origin`; SameSite=Lax cookies.
- Detect: Origin-mismatch logging.
- Recover: n/a.
- Residual: **L**.

**T08 SSRF via URL imports**
- Scenario: "import from URL" pointed at `169.254.169.254` or internal services.
- Impact: internal network access.
- Prevent: **no URL import in the MVP** (FR-ING-8). If added later: host allow-list, DNS pinning, private-IP blocking, no redirects.
- Detect: n/a in the MVP.
- Recover: n/a.
- Residual: **L**.

**T09 Credential stuffing and brute force**
- Scenario: botnets try leaked passwords on staff and citizen logins.
- Impact: account takeover.
- Prevent: Supabase Auth rate limits; Turnstile on sign-in; citizens mostly use OAuth or magic links (no passwords); staff need TOTP anyway; Cloudflare rate-limit rule on auth paths.
- Detect: `security_events` spikes; alert.
- Recover: lock affected accounts, force a reset.
- Residual: **L**.

**T10 Abuse of public APIs**
- Scenario: scraping everything, hammering the claim checker, flooding claim submissions.
- Impact: cost (free-tier quota exhaustion), degraded service, spam.
- Prevent: everything public is aggregate and meant to be public anyway; caching; per-IP limits in Fastify and nginx plus one Cloudflare rule; Turnstile on POSTs; pagination caps; claim submissions moderated.
- Detect: rate-limit metrics; Supabase usage dashboard.
- Recover: tighten limits, block ASNs at the edge.
- Residual: **M** (free-tier quotas are the weak point, not data exposure).

**T11 Privacy leakage through aggregates**
- Scenario: small cells ("1 woman aged 90+ deleted in part 47"), or **differencing** between two releases or two overlapping breakdowns.
- Impact: re-identification.
- Prevent: suppression rules in §5.3; only pre-defined breakdowns (no ad-hoc query API); consistent rounding; release-diff check before publication.
- Detect: automated disclosure check in the publication pipeline that blocks failing releases.
- Recover: retract and republish with a documented reason.
- Residual: **M**.

**T12 Re-identification by combining with other data**
- Scenario: someone joins our part-level outputs with a scraped roll PDF.
- Impact: we'd be enabling profiling.
- Prevent: we never publish row-level data, quasi-identifier combinations or fine geography (no coordinates for individuals; booth coordinates only); suppression; salted Merkle leaves; no inclusion proofs for real data in public.
- Detect: periodic disclosure review.
- Recover: retract.
- Residual: **M** for real data (it's an inherent risk of any aggregate release), **none** for synthetic data.

**T13 Blockchain metadata leakage**
- Scenario: on-chain series IDs, timing or retraction reasons reveal more than intended; people later want something "erased".
- Impact: permanent disclosure.
- Prevent: only hashes and synthetic or official area codes go on-chain; reasons as hashes; salted dataset roots; synthetic series are prefixed `DEMO-`.
- Detect: a review checklist before the first real-data anchor.
- Recover: **none on-chain**, which is why only hashes go there.
- Residual: **L**.

**T14 Incorrect or fraudulent source data**
- Scenario: a fabricated "roll" is uploaded to manufacture a finding, or a genuine source contains errors.
- Impact: false findings with a credible-looking integrity proof.
- Prevent: provenance required (source URL, retrieval time, original checksum, permission basis); steward approval; findings labelled with their source; the methodology page states that **integrity ≠ authenticity**; synthetic data is watermarked everywhere.
- Detect: cross-checks against published official totals where available.
- Recover: retraction with a reason, linked from every affected page.
- Residual: **M**. This is the limit blockchain can't fix.

**T15 AI hallucination or biased wording**
- Scenario: LLM text invents numbers, names a party, or says "fraud"; a translation shifts the meaning.
- Impact: misinformation under our name.
- Prevent: templates by default; the LLM only sees public evidence JSON; a validator checks every number and place against the evidence; banned-term and named-entity filter; template fallback; verdicts and statistics always come from code; human-reviewed translations.
- Detect: validator rejection metrics; user "report a problem" link.
- Recover: disable the LLM flag instantly; correct and republish.
- Residual: **L** with the LLM off, **M** with it on.

**T16 Unauthorised publication**
- Scenario: an insider or a compromised API publishes without review, or calls the contract directly with the hot key.
- Impact: false or unreviewed findings go public and get anchored.
- Prevent: the two-person rule enforced in the database; approvals bind to `manifest_hash`; the anchor service re-checks approvals; the contract's publisher role can be revoked from the offline admin wallet.
- Detect: a **reconciliation job** that compares every `Anchored` event with approved publications and raises a critical alert on any orphan.
- Recover: revoke the publisher role, `retract()` with a reason, publish an incident note.
- Residual: **L–M**.

**T17 Compromised signing key**
- Scenario: the VPS is breached and the anchor key stolen.
- Impact: bogus anchors (testnet, so no money is lost).
- Prevent: the key exists only in the anchor container's secret; the anchor service has no published port; the admin role is offline; the wallet holds a minimal balance.
- Detect: reconciliation (T16); balance and nonce monitoring.
- Recover: the admin revokes the role, a new key is generated and granted, orphan anchors are retracted.
- Residual: **L** (history before the compromise stays intact).

**T18 Database deletion or ransomware**
- Scenario: a leaked service-role key or a malicious insider drops tables.
- Impact: loss of the operational record. (Published manifests survive on-chain and in OTS proofs.)
- Prevent: least-privilege roles; service role only in the API; no destructive endpoints; the audit log has UPDATE and DELETE revoked.
- Detect: row-count and health monitors.
- Recover: restore from the nightly encrypted dump (**recovery point up to 24 hours, because the free tier has no point-in-time recovery**); verify the restore against on-chain manifests.
- Residual: **M** (24 h recovery point is the zero-cost trade-off).

**T19 Outage during high traffic**
- Scenario: roll publication day, a news cycle, or a DDoS.
- Impact: unavailable exactly when needed.
- Prevent: Cloudflare caching and DDoS absorption (if D3 = yes); static and ISR public pages; minimal JS; API rate limits.
- Detect: uptime monitor.
- Recover: serve cached pages only; temporarily disable the claim checker.
- Residual: **M** (single VPS). **H** if D3 = no, because there's then no edge cache or DDoS absorption.

**T20 Malicious insider**
- Scenario: a reviewer suppresses an inconvenient finding, or an analyst tunes thresholds to create one.
- Impact: biased output (A3).
- Prevent: methodology versions frozen and public **before** runs; every run covers every part (no cherry-picking); rejections require a reason and are counted publicly per run ("12 findings, 3 rejected by review"); separation of duties.
- Detect: the auditor role; public rejection counts; methodology change log.
- Recover: re-review by different staff; correction notice.
- Residual: **M**.

**T21 Insecure backups**
- Scenario: a dump is left readable on the VPS or copied to an insecure place.
- Impact: bulk data leak.
- Prevent: `age` encryption with an **off-server** private key; `chmod 600`; no backups in Git; synthetic-only in the MVP.
- Detect: periodic permission check.
- Recover: rotate the key, re-encrypt.
- Residual: **L**.

**T22 Shared VPS blast radius**
- Scenario: a compromise of the other app reaches ElectraLens, or the other way round.
- Impact: cross-project breach.
- Prevent: separate Unix users and directories, separate compose networks, non-root, read-only containers, no shared secrets, nginx server blocks isolated.
- Detect: host auditd or fail2ban logs.
- Recover: rebuild containers, rotate both projects' secrets.
- Residual: **M** (same kernel, same host).

**T23 Supply-chain compromise**
- Scenario: a malicious npm or PyPI update, or a poisoned base image.
- Impact: code execution with service secrets.
- Prevent: lockfiles; pinned versions and image digests; Dependabot alerts (free); minimal dependencies; `npm ci` / `pip install --require-hashes`.
- Detect: `npm audit` / `pip-audit` in CI.
- Recover: roll back the image, rotate secrets.
- Residual: **M**.

**T24 Misuse and misrepresentation of outputs**
- Scenario: a finding screenshot is shared as "ElectraLens proves fraud in X".
- Impact: harm to A3; political weaponisation.
- Prevent: every finding page and image carries its label, signal strength, alternative explanations and a permalink; share cards include "an anomaly is not evidence of wrongdoing"; neutral language rules.
- Detect: monitoring mentions (manual).
- Recover: a public clarification linked from the finding.
- Residual: **M**. It can be reduced, not eliminated.

**T25 Impersonation of ECI**
- Scenario: users mistake ElectraLens for an official portal, or a phishing site copies ours.
- Impact: misplaced trust, legal exposure.
- Prevent: no ECI logos or emblem; a persistent "independent, not affiliated with ECI" notice; official links clearly marked as external.
- Detect: user reports.
- Recover: adjust wording; takedown requests for copies.
- Residual: **L**.

## 4. Security testing plan (feeds Milestone 8)

- pgTAP RLS suite: every table × {anon, citizen, each staff role, staff without `aal2`}.
- API authorisation tests for every route × role, including IDOR attempts.
- Separation-of-duties tests (PRD AC-5).
- Contract tests: no overwrite, no duplicate hash, wrong previous hash reverts, role revocation, retraction event.
- Cross-language canonicalisation vectors (PRD AC-7).
- Fuzzing the upload validator with malformed CSV and Parquet files.
- PII scanner over public API responses and published files (PRD AC-3).
- Disclosure-control tests on aggregates (small cells, differencing).
- OWASP ZAP baseline scan against staging (free).
- Restore drill from backup, timed.
- Manual review: CSP, headers, secrets placement, Docker hardening.

## 5. Privacy-by-design review

### 5.1 Data inventory

| Data | Tier | Purpose | Retention [P] | Access |
|---|---|---|---|---|
| Synthetic roll rows | R | Demo and benchmark | Kept (not personal data) | Worker, analysts; public for demo datasets |
| Real roll rows (future, only after D9) | R | Analysis | Shortest needed; deleted 90 days after the final report unless a legal hold applies | Worker, scoped analysts |
| Dataset salts | R | Inclusion-proof privacy | Same as dataset | Worker |
| Aggregates and findings (published) | P | Transparency | Permanent (public record) | Everyone |
| Citizen email and OAuth ID | Auth | Sign-in | Until account deletion | The user; system |
| Citizen profile, saved items, subscriptions | I (own-row RLS) | Features | Until deletion | The user |
| Claim submissions (text) | I → P after moderation | Claim checking | 1 year if unpublished | Moderators |
| Server and nginx logs (IP, user agent) | I | Security | 14 days | Sysadmin, auditor |
| `security_events` | I | Abuse detection | 180 days | Auditor, sysadmin |
| `audit_log` | I | Accountability | Permanent (append-only, no personal data beyond staff IDs) | Auditor |
| Voice input | Browser | Assistant | Not stored by ElectraLens. The browser's speech service may process audio [A: depends on the browser] | — |

### 5.2 Principles as applied
- **Minimisation:** no EPIC numbers, no phone numbers, no dates of birth for citizens. Staff need only email and MFA.
- **Purpose limitation:** restricted data is used only for the audit run it was approved for.
- **No unofficial personal lookup:** "Is my name on the roll?" always links to the official service.
- **Defaults:** no analytics trackers and no third-party scripts except Turnstile on the pages that need it. Self-hosted fonts.
- **Transparency:** a public privacy page lists exactly this inventory and the retention rules.

### 5.3 Disclosure control for public aggregates
1. No public breakdown below part level.
2. Any cell with **1 to 9** people is suppressed and shown as "< 10" (threshold *k* = 10 [P], configurable per methodology version).
3. Complementary suppression, so a suppressed cell can't be recovered from row or column totals.
4. Cross-tabs (age band × gender × reason) only at constituency level and above.
5. A **release-differencing check**: before publishing version *n*, simulate subtracting it from version *n−1* and from overlapping breakdowns, and block if any derived cell is below *k*.
6. Rounding to the nearest 5 for sub-constituency cross-tabs [P].
7. Synthetic data goes through the same rules, so the demo shows the real behaviour.

### 5.4 QR and booth pages
QR codes contain only `/b/{random code}`. Booth pages contain public facility information only. No per-voter QR codes. Page views are not linked to accounts.

### 5.5 Legal notes (not legal advice)
- The **DPDP Act 2023** applies to digital personal data. The **DPDP Rules 2025** were notified in November 2025 and phase in over about 18 months, with the main obligations from around May 2027 [V, secondary sources; check the Gazette].
- Citizen accounts are personal data: we need a clear notice, a stated purpose, easy deletion (FR-ACC-3) and breach handling.
- Synthetic data isn't personal data. **Real roll data is personal data even when officially published.** Republishing or processing it at scale needs legal review first (decision D9).
- ElectraLens is not affiliated with ECI and doesn't use ECI marks.

### 5.6 Responsible AI and neutrality
- **Code computes, AI explains.** No model decides a finding, a verdict or a signal strength.
- No party, candidate or vote-share data is ingested, which removes the most direct route to partisan framing.
- Uniform rules for every area; methodology published before results; public counts of rejected findings.
- Banned-term filter and fluent-speaker review for all three languages.
- Every finding shows innocent explanations with the same prominence as the evidence.
- A visible correction and retraction history.
