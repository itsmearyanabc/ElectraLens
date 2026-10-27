-- ElectraLens 0009: workflow functions (B06.09). Every state change goes through one of these.
-- Each checks role, MFA, state and separation of duties, then writes the audit log in the same
-- transaction, so no client (including our own API) can skip a step. Errors are stable codes
-- the API maps to problem+json responses.

-- ---- helpers ----------------------------------------------------------------------------

create function el.enqueue(p_kind public.job_kind, p_payload jsonb, p_input_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.jobs (kind, payload, input_hash, created_by)
  values (p_kind, p_payload, p_input_hash, auth.uid())
  on conflict (kind, input_hash) where status not in ('failed', 'dead') do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.jobs
    where kind = p_kind and input_hash = p_input_hash and status not in ('failed', 'dead');
  end if;
  return v_id;
end $$;

create function el.require_text(p_text text, p_min integer, p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  perform el.require(length(btrim(coalesce(p_text, ''))) >= p_min, p_code);
end $$;

-- ---- datasets ---------------------------------------------------------------------------

create function public.create_data_source(
  p_name text, p_publisher text, p_url text, p_basis public.permission_basis,
  p_licence_note text, p_is_synthetic boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform el.require(el.has_role_anywhere('data_steward'), 'auth.forbidden');
  insert into public.data_sources (name, publisher, url, permission_basis, licence_note, is_synthetic, created_by)
  values (p_name, p_publisher, p_url, p_basis, p_licence_note, p_is_synthetic, auth.uid())
  returning id into v_id;
  perform el.log('data_source.create', 'data_source', v_id::text, null,
                 jsonb_build_object('permission_basis', p_basis, 'is_synthetic', p_is_synthetic));
  return v_id;
end $$;

create function public.create_dataset_version(
  p_source uuid, p_kind public.dataset_kind, p_label text, p_qualifying_date date,
  p_stage text, p_jurisdiction uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_source public.data_sources;
  v_id uuid;
begin
  perform el.require(el.has_role('data_steward', p_jurisdiction), 'auth.forbidden');
  select * into v_source from public.data_sources where id = p_source;
  perform el.require(found, 'not_found');
  insert into public.dataset_versions (
    source_id, kind, label, qualifying_date, roll_stage, schema_version, jurisdiction_id,
    is_synthetic, uploaded_by
  ) values (
    p_source, p_kind, p_label, p_qualifying_date, p_stage,
    case p_kind when 'electoral_roll' then 'electoral_roll_v1' else 'polling_stations_v1' end,
    p_jurisdiction, v_source.is_synthetic, auth.uid()
  ) returning id into v_id;
  perform el.log('dataset_version.create', 'dataset_version', v_id::text, null,
                 jsonb_build_object('kind', p_kind, 'label', p_label));
  return v_id;
end $$;

create function public.mark_dataset_uploaded(p_id uuid, p_original_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.dataset_versions;
  v_job uuid;
begin
  select * into v from public.dataset_versions where id = p_id for update;
  perform el.require(found, 'not_found');
  perform el.require(el.has_role('data_steward', v.jurisdiction_id), 'auth.forbidden');
  perform el.require(v.status = 'uploading', 'workflow.illegal_transition');
  perform el.require(p_original_path like 'quarantine/' || p_id::text || '/%', 'workflow.bad_path');
  update public.dataset_versions set status = 'validating', original_path = p_original_path where id = p_id;
  v_job := el.enqueue('ingest', jsonb_build_object('kind', 'ingest', 'dataset_version_id', p_id),
                      el.sha256_hex('ingest:' || p_id::text || ':' || p_original_path));
  perform el.log('dataset_version.uploaded', 'dataset_version', p_id::text, null,
                 jsonb_build_object('job_id', v_job));
  return v_job;
end $$;

-- Worker only: record the result of validation and canonicalisation.
create function public.complete_ingestion(
  p_id uuid, p_valid boolean, p_report jsonb, p_original_sha256 text,
  p_canonical_path text, p_root text, p_row_count integer, p_salt_path text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.dataset_versions;
begin
  select * into v from public.dataset_versions where id = p_id for update;
  perform el.require(found, 'not_found');
  perform el.require(v.status = 'validating', 'workflow.illegal_transition');
  update public.dataset_versions set
    status = case when p_valid then 'validated'::public.dataset_status else 'quarantined' end,
    ingestion_report = p_report,
    original_sha256 = p_original_sha256,
    canonical_path = case when p_valid then p_canonical_path end,
    canonical_root = case when p_valid then p_root end,
    row_count = case when p_valid then p_row_count end,
    salt_path = case when p_valid then p_salt_path end
  where id = p_id;
  perform el.log(case when p_valid then 'dataset_version.validated' else 'dataset_version.quarantined' end,
                 'dataset_version', p_id::text, null, jsonb_build_object('service', 'worker', 'root', p_root));
end $$;

create function public.approve_dataset_version(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.dataset_versions;
begin
  select * into v from public.dataset_versions where id = p_id for update;
  perform el.require(found, 'not_found');
  perform el.require(el.has_role('data_steward', v.jurisdiction_id), 'auth.forbidden');
  perform el.require(v.status = 'validated', 'workflow.illegal_transition');
  update public.dataset_versions
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_id;
  perform el.log('dataset_version.approve', 'dataset_version', p_id::text, null,
                 jsonb_build_object('root', v.canonical_root));
end $$;

-- ---- methodology (two people: one drafts, another freezes) -------------------------------

create function public.create_methodology_draft(
  p_version text, p_params jsonb, p_params_hash text, p_notes text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform el.require(el.has_role_anywhere('analyst'), 'auth.forbidden');
  insert into public.methodology_versions (version, params, params_hash, notes, created_by)
  values (p_version, p_params, p_params_hash, p_notes, auth.uid());
  perform el.log('methodology.draft', 'methodology', p_version, null, jsonb_build_object('params_hash', p_params_hash));
end $$;

create function public.freeze_methodology(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.methodology_versions;
begin
  select * into m from public.methodology_versions where version = p_version for update;
  perform el.require(found, 'not_found');
  perform el.require(el.has_role_anywhere('publisher'), 'auth.forbidden');
  perform el.require(m.created_by is distinct from auth.uid(), 'workflow.same_person');
  update public.methodology_versions set status = 'frozen', frozen_at = now() where version = p_version;
  perform el.log('methodology.freeze', 'methodology', p_version);
end $$;

create function public.publish_methodology(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform el.require(el.has_role_anywhere('publisher'), 'auth.forbidden');
  update public.methodology_versions set status = 'published', published_at = now()
  where version = p_version and status = 'frozen';
  perform el.require(found, 'workflow.illegal_transition');
  perform el.log('methodology.publish', 'methodology', p_version);
end $$;

-- ---- audit runs -------------------------------------------------------------------------

create function public.request_audit_run(p_baseline uuid, p_target uuid, p_methodology text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  b public.dataset_versions;
  t public.dataset_versions;
  m public.methodology_versions;
  v_run uuid;
begin
  select * into b from public.dataset_versions where id = p_baseline;
  perform el.require(found, 'not_found');
  select * into t from public.dataset_versions where id = p_target;
  perform el.require(found, 'not_found');
  perform el.require(el.has_role('analyst', t.jurisdiction_id), 'auth.forbidden');
  perform el.require(b.status = 'approved' and t.status = 'approved', 'workflow.dataset_not_approved');
  perform el.require(b.kind = 'electoral_roll' and t.kind = 'electoral_roll', 'workflow.wrong_dataset_kind');
  perform el.require(b.jurisdiction_id = t.jurisdiction_id, 'workflow.different_areas');
  perform el.require(b.qualifying_date < t.qualifying_date, 'workflow.baseline_not_earlier');
  select * into m from public.methodology_versions where version = p_methodology;
  perform el.require(found and m.status in ('frozen', 'published'), 'workflow.methodology_not_frozen');

  select id into v_run from public.audit_runs
  where baseline_version_id = p_baseline and target_version_id = p_target
    and methodology_version = p_methodology and status <> 'failed'
  limit 1;
  if v_run is not null then
    return v_run;  -- idempotent: the same comparison is never run twice
  end if;

  insert into public.audit_runs (baseline_version_id, target_version_id, methodology_version, params_hash, created_by)
  values (p_baseline, p_target, p_methodology, m.params_hash, auth.uid())
  returning id into v_run;
  perform el.enqueue('analyze', jsonb_build_object('kind', 'analyze', 'run_id', v_run),
                     el.sha256_hex('analyze:' || v_run::text));
  perform el.log('audit_run.request', 'audit_run', v_run::text, null,
                 jsonb_build_object('baseline', b.canonical_root, 'target', t.canonical_root,
                                    'methodology', p_methodology));
  return v_run;
end $$;

-- Worker only.
create function public.start_run(p_run uuid, p_engine text, p_image text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.audit_runs
  set status = 'running', started_at = now(), engine_version = p_engine, image_digest = p_image
  where id = p_run and status = 'queued';
  perform el.require(found, 'workflow.illegal_transition');
end $$;

-- Worker only. Findings and aggregates are inserted in the same transaction before this call.
create function public.complete_run(
  p_run uuid, p_ok boolean, p_input_roots jsonb, p_output_hash text, p_tests jsonb, p_error text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.audit_runs set
    status = case when p_ok then 'ready_for_review'::public.run_status else 'failed' end,
    input_roots = p_input_roots,
    output_hash = p_output_hash,
    tests_in_run = p_tests,
    error = p_error,
    finished_at = now()
  where id = p_run and status = 'running';
  perform el.require(found, 'workflow.illegal_transition');
  perform el.log(case when p_ok then 'audit_run.complete' else 'audit_run.fail' end, 'audit_run', p_run::text,
                 null, jsonb_build_object('service', 'worker', 'output_hash', p_output_hash));
end $$;

create function public.review_finding(p_finding uuid, p_decision public.review_decision, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.anomaly_findings;
  r public.audit_runs;
begin
  select * into f from public.anomaly_findings where id = p_finding for update;
  perform el.require(found, 'not_found');
  select * into r from public.audit_runs where id = f.run_id;
  perform el.require(el.has_role('reviewer', f.jurisdiction_id), 'auth.forbidden');
  perform el.require(r.created_by <> auth.uid(), 'workflow.run_creator_cannot_review');
  perform el.require(r.status = 'ready_for_review', 'workflow.illegal_transition');
  perform el.require(p_decision <> 'pending', 'workflow.bad_decision');
  if p_decision <> 'accepted' then
    perform el.require_text(p_reason, 5, 'workflow.reason_required');
  end if;
  insert into public.finding_reviews (finding_id, reviewer_id, decision, reason)
  values (p_finding, auth.uid(), p_decision, p_reason);
  update public.anomaly_findings set review_status = p_decision where id = p_finding;
  perform el.log('finding.review', 'finding', p_finding::text, p_reason,
                 jsonb_build_object('decision', p_decision, 'rule', f.rule_id));
end $$;

-- ---- publication ------------------------------------------------------------------------

create function public.create_publication(p_run uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.audit_runs;
  t public.dataset_versions;
  v_series text;
  v_sequence integer;
  v_previous uuid;
  v_id uuid;
begin
  select * into r from public.audit_runs where id = p_run;
  perform el.require(found, 'not_found');
  select * into t from public.dataset_versions where id = r.target_version_id;
  perform el.require(el.has_role('publisher', t.jurisdiction_id), 'auth.forbidden');
  perform el.require(r.status = 'ready_for_review', 'workflow.illegal_transition');
  perform el.require(
    not exists (select 1 from public.anomaly_findings where run_id = p_run and review_status = 'pending'),
    'workflow.findings_unreviewed');
  select code into v_series from public.jurisdictions where id = t.jurisdiction_id;
  perform el.require(
    not exists (select 1 from public.publications
                where series_id = v_series and status in ('draft', 'preparing', 'in_review', 'approved')),
    'workflow.publication_in_progress');

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.publications where series_id = v_series and status <> 'withdrawn';
  select id into v_previous from public.publications
  where series_id = v_series and status in ('published', 'retracted')
  order by sequence desc limit 1;

  insert into public.publications (series_id, sequence, run_id, status, previous_publication_id, is_synthetic, created_by)
  values (v_series, v_sequence, p_run, 'preparing', v_previous, t.is_synthetic, auth.uid())
  returning id into v_id;
  perform el.enqueue('publish_prepare', jsonb_build_object('kind', 'publish_prepare', 'publication_id', v_id),
                     el.sha256_hex('publish_prepare:' || v_id::text));
  perform el.log('publication.create', 'publication', v_id::text, null,
                 jsonb_build_object('series', v_series, 'sequence', v_sequence, 'run', p_run));
  return v_id;
end $$;

-- Worker only: the manifest is built, suppressed and PII-scanned; hand it to the reviewers.
create function public.submit_publication(
  p_id uuid, p_manifest jsonb, p_manifest_hash text, p_report_path text, p_report_hash text,
  p_aggregates_path text, p_aggregates_hash text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.publications;
  v_previous_hash text;
begin
  select * into p from public.publications where id = p_id for update;
  perform el.require(found, 'not_found');
  perform el.require(p.status = 'preparing', 'workflow.illegal_transition');
  perform el.require(p_manifest ->> 'series_id' = p.series_id
                     and (p_manifest ->> 'sequence')::integer = p.sequence, 'publication.manifest_mismatch');
  select manifest_hash into v_previous_hash from public.publications where id = p.previous_publication_id;
  perform el.require((p_manifest ->> 'previous_manifest_hash') is not distinct from v_previous_hash,
                     'publication.broken_chain');
  update public.publications set
    status = 'in_review', manifest = p_manifest, manifest_hash = p_manifest_hash,
    report_path = p_report_path, report_hash = p_report_hash,
    aggregates_path = p_aggregates_path, aggregates_hash = p_aggregates_hash, submitted_at = now()
  where id = p_id;
  perform el.log('publication.submit', 'publication', p_id::text, null,
                 jsonb_build_object('service', 'worker', 'manifest_hash', p_manifest_hash));
end $$;

-- FR-GOV-2: a reviewer and a publisher, two different people, neither of whom created the run.
create function public.approve_publication(
  p_id uuid, p_step public.approval_step, p_manifest_hash text, p_decision text, p_reason text
) returns public.publication_status
language plpgsql security definer set search_path = '' as $$
declare
  p public.publications;
  r public.audit_runs;
  t public.dataset_versions;
  v_role public.staff_role;
  v_status public.publication_status;
begin
  select * into p from public.publications where id = p_id for update;
  perform el.require(found, 'not_found');
  select * into r from public.audit_runs where id = p.run_id;
  select * into t from public.dataset_versions where id = r.target_version_id;
  v_role := case p_step when 'review' then 'reviewer'::public.staff_role else 'publisher' end;
  perform el.require(el.has_role(v_role, t.jurisdiction_id), 'auth.forbidden');
  perform el.require(p.status = 'in_review', 'workflow.illegal_transition');
  perform el.require(p_manifest_hash = p.manifest_hash, 'workflow.stale_manifest');
  perform el.require(r.created_by <> auth.uid(), 'workflow.run_creator_cannot_approve');
  perform el.require(
    not exists (select 1 from public.publication_approvals where publication_id = p_id and approver_id = auth.uid()),
    'workflow.same_person');
  perform el.require(p_decision in ('approve', 'reject'), 'workflow.bad_decision');
  if p_step = 'publish' then
    perform el.require(
      exists (select 1 from public.publication_approvals
              where publication_id = p_id and step = 'review' and decision = 'approve'),
      'workflow.review_first');
  end if;
  if p_decision = 'reject' then
    perform el.require_text(p_reason, 10, 'workflow.reason_required');
  end if;

  insert into public.publication_approvals (publication_id, approver_id, step, manifest_hash, decision, reason)
  values (p_id, auth.uid(), p_step, p_manifest_hash, p_decision, p_reason);

  if p_decision = 'reject' then
    v_status := 'withdrawn';
  elsif p_step = 'publish' then
    v_status := 'approved';
  else
    v_status := 'in_review';
  end if;
  update public.publications
  set status = v_status, approved_at = case when v_status = 'approved' then now() end
  where id = p_id;
  perform el.log('publication.' || p_decision, 'publication', p_id::text, p_reason,
                 jsonb_build_object('step', p_step, 'manifest_hash', p_manifest_hash));
  return v_status;
end $$;

-- Anchor service only, after the on-chain transaction is confirmed.
create function public.mark_published(
  p_id uuid, p_network text, p_chain_id bigint, p_contract text, p_tx_hash text,
  p_block bigint, p_log_index integer
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.publications;
  r public.audit_runs;
begin
  select * into p from public.publications where id = p_id for update;
  perform el.require(found, 'not_found');
  perform el.require(p.status = 'approved', 'workflow.illegal_transition');
  perform el.require(
    (select count(*) from public.publication_approvals
     where publication_id = p_id and decision = 'approve' and manifest_hash = p.manifest_hash) = 2,
    'workflow.missing_approvals');
  select * into r from public.audit_runs where id = p.run_id;

  insert into public.blockchain_anchors (publication_id, anchor_type, network, chain_id, contract_address,
                                         tx_hash, block_number, log_index, status, confirmed_at)
  values (p_id, 'evm', p_network, p_chain_id, p_contract, p_tx_hash, p_block, p_log_index, 'confirmed', now())
  on conflict (publication_id, anchor_type) do update set
    network = excluded.network, chain_id = excluded.chain_id, contract_address = excluded.contract_address,
    tx_hash = excluded.tx_hash, block_number = excluded.block_number, log_index = excluded.log_index,
    status = 'confirmed', confirmed_at = now(), last_error = null;

  update public.publications set status = 'published', published_at = now() where id = p_id;
  update public.anomaly_findings set published = true
  where run_id = p.run_id and review_status in ('accepted', 'downgraded') and signal_strength <> 'weak';
  update public.aggregate_metrics set published = true where publication_id = p_id;
  update public.dataset_versions set is_public = true
  where id in (r.baseline_version_id, r.target_version_id);
  update public.data_sources set is_public = true
  where id in (select source_id from public.dataset_versions where id in (r.baseline_version_id, r.target_version_id));
  perform el.log('publication.publish', 'publication', p_id::text, null,
                 jsonb_build_object('service', 'anchor', 'tx_hash', p_tx_hash, 'block', p_block));
end $$;

create function public.retract_publication(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.publications;
  t public.dataset_versions;
begin
  select * into p from public.publications where id = p_id for update;
  perform el.require(found, 'not_found');
  select d.* into t from public.dataset_versions d join public.audit_runs r on r.target_version_id = d.id
  where r.id = p.run_id;
  perform el.require(el.has_role('publisher', t.jurisdiction_id), 'auth.forbidden');
  perform el.require(p.status = 'published', 'workflow.illegal_transition');
  perform el.require_text(p_reason, 10, 'workflow.reason_required');
  update public.publications set status = 'retracted', retracted_at = now(), retraction_reason = p_reason
  where id = p_id;
  perform el.log('publication.retract', 'publication', p_id::text, p_reason);
end $$;

-- ---- staff roles ------------------------------------------------------------------------

create function public.grant_role(p_user uuid, p_role public.staff_role, p_jurisdiction uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform el.require(el.has_role('sysadmin'), 'auth.forbidden');
  perform el.require(p_user <> auth.uid(), 'workflow.self_grant');
  perform el.require(exists (select 1 from auth.users where id = p_user), 'not_found');
  insert into public.staff_assignments (user_id, role, jurisdiction_id, granted_by)
  values (p_user, p_role, p_jurisdiction, auth.uid())
  returning id into v_id;
  perform el.log('staff.grant', 'staff_assignment', v_id::text, null,
                 jsonb_build_object('user', p_user, 'role', p_role, 'jurisdiction', p_jurisdiction));
  return v_id;
end $$;

create function public.revoke_role(p_assignment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform el.require(el.has_role('sysadmin'), 'auth.forbidden');
  perform el.require_text(p_reason, 5, 'workflow.reason_required');
  update public.staff_assignments
  set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = p_reason
  where id = p_assignment and revoked_at is null;
  perform el.require(found, 'not_found');
  perform el.log('staff.revoke', 'staff_assignment', p_assignment::text, p_reason);
end $$;

-- ---- job queue (worker only) ------------------------------------------------------------

create function public.claim_next_job(
  p_kinds public.job_kind[], p_worker text, p_lease_seconds integer default 300
) returns setof public.jobs
language plpgsql security definer set search_path = '' as $$
begin
  -- Jobs whose last attempt died without reporting back are dead-lettered.
  update public.jobs
  set status = 'dead', locked_by = null, locked_until = null,
      last_error = coalesce(last_error, 'lease expired on the final attempt')
  where status = 'running' and locked_until < now() and attempts >= max_attempts;

  return query
  update public.jobs j
  set status = 'running', locked_by = p_worker,
      locked_until = now() + make_interval(secs => p_lease_seconds), attempts = j.attempts + 1
  where j.id = (
    select c.id from public.jobs c
    where c.kind = any (p_kinds)
      and ((c.status = 'queued' and c.run_after <= now())
           or (c.status = 'running' and c.locked_until < now()))
    order by c.run_after, c.created_at
    for update skip locked
    limit 1
  )
  returning j.*;
end $$;

create function public.complete_job(p_id uuid, p_worker text, p_result jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.jobs
  set status = 'succeeded', result = p_result, locked_by = null, locked_until = null
  where id = p_id and status = 'running' and locked_by = p_worker;
  perform el.require(found, 'job.not_owner');
end $$;

create function public.fail_job(p_id uuid, p_worker text, p_error text) returns public.job_status
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.job_status;
begin
  update public.jobs set
    status = case when attempts >= max_attempts then 'dead'::public.job_status else 'queued' end,
    run_after = now() + make_interval(secs => 30 * power(2, attempts - 1)::integer),
    last_error = left(p_error, 2000), locked_by = null, locked_until = null
  where id = p_id and status = 'running' and locked_by = p_worker
  returning status into v_status;
  perform el.require(found, 'job.not_owner');
  return v_status;
end $$;

-- ---- claims -----------------------------------------------------------------------------

-- API only, after Turnstile and the code-computed verdict.
create function public.submit_claim(
  p_submitter uuid, p_text text, p_structured jsonb, p_language text, p_ip_hash text,
  p_verdict public.claim_verdict, p_evidence jsonb, p_publication uuid, p_method_version text,
  p_explanation jsonb, p_for_moderation boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.claim_submissions (submitter_id, text, structured, language, status, ip_hash)
  values (p_submitter, p_text, p_structured, p_language,
          case when p_for_moderation then 'in_moderation'::public.claim_status else 'checked' end, p_ip_hash)
  returning id into v_id;
  insert into public.claim_assessments (claim_id, verdict, evidence, publication_id, method_version, explanation)
  values (v_id, p_verdict, p_evidence, p_publication, p_method_version, p_explanation);
  return v_id;
end $$;

create function public.moderate_claim(p_claim uuid, p_publish boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform el.require(el.has_role_anywhere('reviewer'), 'auth.forbidden');
  if not p_publish then
    perform el.require_text(p_reason, 5, 'workflow.reason_required');
  end if;
  update public.claim_submissions
  set status = case when p_publish then 'published'::public.claim_status else 'rejected' end,
      moderated_by = auth.uid(), moderation_reason = p_reason, moderated_at = now()
  where id = p_claim and status = 'in_moderation';
  perform el.require(found, 'workflow.illegal_transition');
  perform el.log('claim.' || case when p_publish then 'publish' else 'reject' end, 'claim', p_claim::text, p_reason);
end $$;

-- Account deletion, step 1 (B14.06): the API then deletes the auth user, which cascades.
create function public.delete_own_unpublished_claims() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform el.require(auth.uid() is not null, 'auth.required');
  delete from public.claim_submissions where submitter_id = auth.uid() and status <> 'published';
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---- execute privileges -----------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema el from public;
grant execute on function el.mfa_ok(), el.ancestors(uuid), el.has_role(public.staff_role, uuid),
  el.has_role_anywhere(public.staff_role), el.is_staff()
  to anon, authenticated, service_role;

-- Signed-in users (each function checks role and MFA itself).
grant execute on function
  public.create_data_source(text, text, text, public.permission_basis, text, boolean),
  public.create_dataset_version(uuid, public.dataset_kind, text, date, text, uuid),
  public.mark_dataset_uploaded(uuid, text),
  public.approve_dataset_version(uuid),
  public.create_methodology_draft(text, jsonb, text, text),
  public.freeze_methodology(text),
  public.publish_methodology(text),
  public.request_audit_run(uuid, uuid, text),
  public.review_finding(uuid, public.review_decision, text),
  public.create_publication(uuid),
  public.approve_publication(uuid, public.approval_step, text, text, text),
  public.retract_publication(uuid, text),
  public.grant_role(uuid, public.staff_role, uuid),
  public.revoke_role(uuid, text),
  public.moderate_claim(uuid, boolean, text),
  public.delete_own_unpublished_claims()
  to authenticated;

-- Services only (worker, anchor, API system paths).
grant execute on function
  public.complete_ingestion(uuid, boolean, jsonb, text, text, text, integer, text),
  public.start_run(uuid, text, text),
  public.complete_run(uuid, boolean, jsonb, text, jsonb, text),
  public.submit_publication(uuid, jsonb, text, text, text, text, text),
  public.mark_published(uuid, text, bigint, text, text, bigint, integer),
  public.claim_next_job(public.job_kind[], text, integer),
  public.complete_job(uuid, text, jsonb),
  public.fail_job(uuid, text, text),
  public.submit_claim(uuid, text, jsonb, text, text, public.claim_verdict, jsonb, uuid, text, jsonb, boolean)
  to service_role;
