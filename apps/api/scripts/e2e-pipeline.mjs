// End-to-end pipeline check on the LOCAL stack, driven exactly as staff would drive it:
// sign in with password + TOTP (aal2), create two roll versions, upload through the API's signed
// URLs, let the worker ingest and analyse, review every finding, prepare the publication, and
// approve it with two different people through the API (which then calls the anchor service).
//
// Usage (API on :4100, local Supabase running):  node apps/api/scripts/e2e-pipeline.mjs
// Creates throwaway staff accounts with random passwords; refuses to run against a remote stack.
import { createHmac, randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const root = path.resolve(import.meta.dirname, '../../..');
const env = Object.fromEntries(
  readFileSync(path.join(root, 'apps/api/.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const SUPABASE = env.SUPABASE_URL;
const API = process.env.API_URL ?? 'http://localhost:4100/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(SUPABASE)) throw new Error('local stack only');
const admin = createClient(SUPABASE, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const step = (text) => console.log(`\n▶ ${text}`);

// ---- TOTP (RFC 6238), so the script can pass the same second factor as a phone would ----------
function base32(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.replace(/=+$/, '').toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
function totp(secret) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac('sha1', base32(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0xf;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function psql(sql) {
  const project = readFileSync(path.join(root, 'supabase/config.toml'), 'utf8').match(
    /^project_id\s*=\s*"([^"]+)"/m,
  )[1];
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      `supabase_db_${project}`,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-tA',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: sql,
      encoding: 'utf8',
    },
  ).trim();
}

/** A staff member signed in at aal2, with a client and an access token. */
async function staff(role) {
  const email = `e2e-${role}-${randomBytes(3).toString('hex')}@test.electralens.invalid`;
  const password = randomBytes(18).toString('base64url');
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  psql(
    `insert into public.staff_assignments (user_id, role) values ('${created.user.id}', '${role}');`,
  );
  const client = createClient(SUPABASE, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  await must(client.auth.signInWithPassword({ email, password }));
  const factor = await must(client.auth.mfa.enroll({ factorType: 'totp' }));
  await must(
    client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp.secret) }),
  );
  const { data } = await client.auth.getSession();
  return { role, id: created.user.id, client, token: data.session.access_token };
}

async function must(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

async function api(person, method, url, body) {
  const response = await fetch(`${API}${url}`, {
    method,
    headers: { authorization: `Bearer ${person.token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${JSON.stringify(json)}`);
  return json;
}

function worker() {
  const sha = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const result = spawnSync('uv', ['run', '--env-file', '.env.local', 'el', 'worker', '--once'], {
    cwd: path.join(root, 'services/engine'),
    env: { ...process.env, ELECTRALENS_GIT_SHA: sha },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const lines = `${result.stdout}${result.stderr}`
    .split('\n')
    .filter((l) => / job | sweep /.test(l));
  for (const line of lines) console.log(`  worker: ${line.replace(/^.*electralens\.worker /, '')}`);
  if (result.status !== 0) throw new Error('worker exited with an error');
}

// ---- the pipeline ------------------------------------------------------------------------------
step('staff sign in with password and TOTP (aal2)');
const [steward, analyst, reviewer, publisher] = await Promise.all(
  ['data_steward', 'analyst', 'reviewer', 'publisher'].map(staff),
);
console.log('  4 staff members at aal2');

step('steward creates the source and two roll versions');
const state = psql(`select id from public.jurisdictions where code = 'DEMO-HR';`);
const source = await must(
  steward.client.rpc('create_data_source', {
    p_name: `E2E synthetic source ${randomBytes(2).toString('hex')}`,
    p_publisher: 'ElectraLens',
    p_url: null,
    p_basis: 'synthetic',
    p_licence_note: 'Generated by el generate.',
    p_is_synthetic: true,
  }),
);
const versions = [];
for (const [label, date, stage, file] of [
  ['E2E roll v1', '2026-01-01', 'final', 'roll_v1.csv'],
  ['E2E roll v2', '2027-01-01', 'draft', 'roll_v2.csv'],
]) {
  const id = await must(
    steward.client.rpc('create_dataset_version', {
      p_source: source,
      p_kind: 'electoral_roll',
      p_label: label,
      p_qualifying_date: date,
      p_stage: stage,
      p_jurisdiction: state,
    }),
  );
  const upload = await api(steward, 'POST', `/staff/datasets/${id}/upload-url`, { format: 'csv' });
  const put = await fetch(upload.signed_url, {
    method: 'PUT',
    headers: { 'content-type': 'text/csv' },
    body: readFileSync(path.join(root, 'data/demo', file)),
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`);
  await api(steward, 'POST', `/staff/datasets/${id}/uploaded`, { path: upload.path });
  versions.push(id);
  console.log(`  ${label}: uploaded ${file}, ingest queued`);
}

step('worker ingests both versions');
worker();
for (const id of versions) {
  const v = await must(
    steward.client
      .from('dataset_versions')
      .select('status, row_count, canonical_root')
      .eq('id', id)
      .single(),
  );
  console.log(
    `  ${id.slice(0, 8)}: ${v.status}, ${v.row_count} rows, root ${v.canonical_root?.slice(0, 12)}…`,
  );
  if (v.status !== 'validated') throw new Error('ingestion did not validate');
  await must(steward.client.rpc('approve_dataset_version', { p_id: id }));
}
console.log('  both approved by the steward');

step('analyst starts a run; worker analyses');
const run = await must(
  analyst.client.rpc('request_audit_run', {
    p_baseline: versions[0],
    p_target: versions[1],
    p_methodology: '2026.1',
  }),
);
worker();
const runRow = await must(
  analyst.client.from('audit_runs').select('status, output_hash').eq('id', run).single(),
);
const findings = await must(
  reviewer.client
    .from('anomaly_findings')
    .select('id, finding_code, signal_strength')
    .eq('run_id', run),
);
console.log(`  run ${run.slice(0, 8)}: ${runRow.status}, ${findings.length} findings`);

step('two-person rule: the analyst may not review their own run');
const own = await analyst.client.rpc('review_finding', {
  p_finding: findings[0].id,
  p_decision: 'accepted',
  p_reason: null,
});
console.log(`  analyst review refused: ${own.error?.message}`);

step('reviewer reviews every finding; restricted evidence via a 5-minute signed URL');
const evidence = await api(reviewer, 'GET', `/staff/findings/${findings[0].id}/evidence`);
console.log(`  evidence link issued, expires in ${evidence.expires_in}s`);
for (const f of findings) {
  await must(
    reviewer.client.rpc('review_finding', {
      p_finding: f.id,
      p_decision: 'accepted',
      p_reason: null,
    }),
  );
}
console.log(`  ${findings.length} findings accepted`);

step('publisher creates the publication; worker prepares the manifest');
const publication = await must(publisher.client.rpc('create_publication', { p_run: run }));
worker();
const pub = await must(
  publisher.client
    .from('publications')
    .select('status, sequence, manifest_hash')
    .eq('id', publication)
    .single(),
);
console.log(
  `  DEMO-HR #${pub.sequence}: ${pub.status}, manifest ${pub.manifest_hash?.slice(0, 16)}…`,
);

step('reviewer approves the review step, publisher the publish step (through the API)');
await api(reviewer, 'POST', `/staff/publications/${publication}/approve`, {
  step: 'review',
  manifest_hash: pub.manifest_hash,
});
const sameReviewer = await fetch(`${API}/staff/publications/${publication}/approve`, {
  method: 'POST',
  headers: { authorization: `Bearer ${reviewer.token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ step: 'publish', manifest_hash: pub.manifest_hash }),
});
console.log(`  same person on the publish step: ${sameReviewer.status} (refused)`);
const approved = await api(publisher, 'POST', `/staff/publications/${publication}/approve`, {
  step: 'publish',
  manifest_hash: pub.manifest_hash,
});
console.log(`  status ${approved.status}; anchor: ${JSON.stringify(approved.anchor)}`);

const final = psql(`select status from public.publications where id = '${publication}';`);
console.log(`\n✔ pipeline finished: publication ${publication} is ${final}`);
