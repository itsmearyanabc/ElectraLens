// Resets the LOCAL Supabase stack and loads the synthetic demo publication into it:
// database rows through psql in the database container, public artifacts through Storage.
// Refuses to run against anything that is not a local stack.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const publishDir = path.join(root, 'data', 'demo', 'publish');

// Every argument here is a fixed string from this file. On Windows npx and pnpm are .cmd shims,
// which only start through a shell, so the command is passed as one string.
function run(command, args, options = {}) {
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? [command, ...args].join(' ') : command, windows ? [] : args, {
    cwd: root,
    shell: windows,
    encoding: 'utf8',
    stdio:
      options.input === undefined ? ['inherit', 'pipe', 'inherit'] : ['pipe', 'pipe', 'inherit'],
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

function localStack() {
  const values = Object.fromEntries(
    run('npx', ['supabase', 'status', '-o', 'env'])
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
  const apiUrl = new URL(values.API_URL);
  if (!['127.0.0.1', 'localhost'].includes(apiUrl.hostname)) {
    throw new Error(`refusing to load demo data into ${apiUrl.host}: not a local stack`);
  }
  const key = values.SECRET_KEY ?? values.SERVICE_ROLE_KEY;
  if (!key) throw new Error('local stack reported no secret key');
  const projectId = readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8').match(
    /^project_id\s*=\s*"([^"]+)"/m,
  )?.[1];
  if (!projectId) throw new Error('project_id not found in supabase/config.toml');
  return { apiUrl: apiUrl.origin, key, dbContainer: `supabase_db_${projectId}` };
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else yield full;
  }
}

console.log('1/4 resetting the local database (migrations + seed)');
run('npx', ['supabase', 'db', 'reset']);

console.log('2/4 building demo content from data/demo');
run('uv', [
  'run',
  '--directory',
  'services/engine',
  'el',
  'demo-sql',
  '--demo-dir',
  '../../data/demo',
  '--out',
  '../../data/demo/publish',
]);

const stack = localStack();
console.log('3/4 loading demo rows');
run(
  'docker',
  [
    'exec',
    '-i',
    stack.dbContainer,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
  ],
  {
    input: readFileSync(path.join(publishDir, 'demo.sql'), 'utf8'),
  },
);

console.log('4/4 uploading public artifacts');
const artifactsDir = path.join(publishDir, 'artifacts');
for (const file of files(artifactsDir)) {
  const objectPath = path.relative(artifactsDir, file).split(path.sep).join('/');
  const response = await fetch(`${stack.apiUrl}/storage/v1/object/public-artifacts/${objectPath}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stack.key}`,
      apikey: stack.key,
      'content-type': 'application/json',
      'cache-control': 'max-age=60',
      'x-upsert': 'true',
    },
    body: readFileSync(file),
  });
  if (!response.ok)
    throw new Error(`upload ${objectPath}: ${response.status} ${await response.text()}`);
  console.log(`  public-artifacts/${objectPath}`);
}
console.log('demo content loaded');
