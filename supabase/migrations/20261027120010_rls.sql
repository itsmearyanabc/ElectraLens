-- ElectraLens 0010: row-level security and table privileges (B06.10, AC-4).
-- Two layers: privileges decide which tables and columns a role can touch at all; RLS decides
-- which rows. Anonymous visitors see published rows only, and only public columns.

-- ---- start from nothing -----------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---- RLS on every table -----------------------------------------------------------------
alter table public.jurisdictions enable row level security;
alter table public.data_sources enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.methodology_versions enable row level security;
alter table public.polling_stations enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_runs enable row level security;
alter table public.anomaly_findings enable row level security;
alter table public.finding_reviews enable row level security;
alter table public.publications enable row level security;
alter table public.publication_approvals enable row level security;
alter table public.blockchain_anchors enable row level security;
alter table public.aggregate_metrics enable row level security;
alter table public.claim_submissions enable row level security;
alter table public.claim_assessments enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.saved_items enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.audit_log enable row level security;
alter table public.security_events enable row level security;
alter table public.incident_records enable row level security;

-- ---- anonymous visitors: public columns only ---------------------------------------------
grant select on public.jurisdictions to anon;
grant select (id, public_code, station_code, ac_id, parts_served, name, address, lat, lng, accessibility,
              source_url, verified_at, is_synthetic, published) on public.polling_stations to anon;
grant select (id, name, publisher, url, permission_basis, licence_note, is_synthetic, is_public)
  on public.data_sources to anon;
grant select (id, source_id, kind, label, qualifying_date, roll_stage, schema_version, jurisdiction_id,
              status, canonical_root, row_count, is_synthetic, is_public, created_at)
  on public.dataset_versions to anon;
grant select (version, params, params_hash, status, notes, published_at) on public.methodology_versions to anon;
grant select (id, baseline_version_id, target_version_id, methodology_version, status, engine_version,
              image_digest, params_hash, input_roots, output_hash, tests_in_run, finished_at)
  on public.audit_runs to anon;
grant select (id, run_id, finding_code, rule_id, rule_version, jurisdiction_id, signal_strength, finding,
              review_status, label, published, created_at)
  on public.anomaly_findings to anon;
grant select (id, run_id, publication_id, jurisdiction_id, metric, dims, value, suppressed, published)
  on public.aggregate_metrics to anon;
grant select (id, series_id, sequence, run_id, status, manifest, manifest_hash, previous_publication_id,
              supersedes_id, report_path, report_hash, aggregates_path, aggregates_hash, is_synthetic,
              published_at, retracted_at, retraction_reason)
  on public.publications to anon;
grant select (publication_id, step, decision, created_at) on public.publication_approvals to anon;
grant select (publication_id, anchor_type, network, chain_id, contract_address, tx_hash, block_number,
              log_index, ots_path, status, confirmed_at)
  on public.blockchain_anchors to anon;
grant select (id, text, structured, language, status, created_at) on public.claim_submissions to anon;
grant select (id, claim_id, verdict, evidence, publication_id, method_version, explanation, created_at)
  on public.claim_assessments to anon;

-- ---- signed-in users: rows decided by RLS -------------------------------------------------
grant select on all tables in schema public to authenticated;
grant update (display_name, preferred_language, notify_email) on public.profiles to authenticated;
grant insert (user_id, item_type, item_id), delete on public.saved_items to authenticated;
grant insert (user_id, target_type, target_id), delete on public.user_subscriptions to authenticated;

-- ---- policies: published content --------------------------------------------------------
create policy "areas are public" on public.jurisdictions
  for select to anon, authenticated using (true);

create policy "published stations" on public.polling_stations
  for select to anon, authenticated using (published);
create policy "staff read stations" on public.polling_stations
  for select to authenticated using ((select el.is_staff()));

create policy "public sources" on public.data_sources
  for select to anon, authenticated using (is_public);
create policy "staff read sources" on public.data_sources
  for select to authenticated using ((select el.is_staff()));

create policy "public versions" on public.dataset_versions
  for select to anon, authenticated using (is_public);
create policy "staff read versions" on public.dataset_versions
  for select to authenticated using ((select el.is_staff()));

create policy "published methodology" on public.methodology_versions
  for select to anon, authenticated using (status = 'published');
create policy "staff read methodology" on public.methodology_versions
  for select to authenticated using ((select el.is_staff()));

create policy "published runs" on public.audit_runs
  for select to anon, authenticated using (
    exists (select 1 from public.publications p
            where p.run_id = audit_runs.id and p.status in ('published', 'retracted'))
  );
create policy "staff read runs" on public.audit_runs
  for select to authenticated using ((select el.is_staff()));

-- Weak findings are shown to reviewers only (B04.06).
create policy "published findings" on public.anomaly_findings
  for select to anon, authenticated using (published and signal_strength <> 'weak');
create policy "staff read findings" on public.anomaly_findings
  for select to authenticated using ((select el.is_staff()));

create policy "staff read reviews" on public.finding_reviews
  for select to authenticated using ((select el.is_staff()));

create policy "published aggregates" on public.aggregate_metrics
  for select to anon, authenticated using (published);
create policy "staff read aggregates" on public.aggregate_metrics
  for select to authenticated using ((select el.is_staff()));

create policy "public publications" on public.publications
  for select to anon, authenticated using (status in ('published', 'retracted'));
create policy "staff read publications" on public.publications
  for select to authenticated using ((select el.is_staff()));

create policy "approvals of public publications" on public.publication_approvals
  for select to anon, authenticated using (
    exists (select 1 from public.publications p
            where p.id = publication_approvals.publication_id and p.status in ('published', 'retracted'))
  );
create policy "staff read approvals" on public.publication_approvals
  for select to authenticated using ((select el.is_staff()));

create policy "anchors of public publications" on public.blockchain_anchors
  for select to anon, authenticated using (
    exists (select 1 from public.publications p
            where p.id = blockchain_anchors.publication_id and p.status in ('published', 'retracted'))
  );
create policy "staff read anchors" on public.blockchain_anchors
  for select to authenticated using ((select el.is_staff()));

create policy "staff read jobs" on public.jobs
  for select to authenticated using ((select el.is_staff()));

-- ---- policies: claims -------------------------------------------------------------------
create policy "published claims" on public.claim_submissions
  for select to anon, authenticated using (status = 'published');
create policy "own claims" on public.claim_submissions
  for select to authenticated using (submitter_id = (select auth.uid()));
create policy "moderators read claims" on public.claim_submissions
  for select to authenticated using ((select el.has_role_anywhere('reviewer')));

create policy "assessments of visible claims" on public.claim_assessments
  for select to anon, authenticated using (
    exists (select 1 from public.claim_submissions c where c.id = claim_assessments.claim_id)
  );

-- ---- policies: a person's own data ------------------------------------------------------
create policy "own profile" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own saved items" on public.saved_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "save for self" on public.saved_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "unsave own" on public.saved_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "own subscriptions" on public.user_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "subscribe self" on public.user_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "unsubscribe own" on public.user_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Staff can always see their own roles (so the console can ask for MFA); admins and auditors see all.
create policy "own roles" on public.staff_assignments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "admins and auditors read roles" on public.staff_assignments
  for select to authenticated using (
    (select el.has_role('sysadmin')) or (select el.has_role('security_auditor'))
  );

-- ---- policies: governance ---------------------------------------------------------------
create policy "admins and auditors read audit log" on public.audit_log
  for select to authenticated using (
    (select el.has_role('sysadmin')) or (select el.has_role('security_auditor'))
  );
create policy "admins and auditors read security events" on public.security_events
  for select to authenticated using (
    (select el.has_role('sysadmin')) or (select el.has_role('security_auditor'))
  );
create policy "admins and auditors read incidents" on public.incident_records
  for select to authenticated using (
    (select el.has_role('sysadmin')) or (select el.has_role('security_auditor'))
  );
