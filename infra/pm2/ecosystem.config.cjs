// pm2 processes for ElectraLens on the VPS (S8). Everything listens on 127.0.0.1; host nginx is
// the only public entry point. Secrets live only in /etc/electralens/*.env (root, chmod 600),
// passed to each process with --env-file and never committed.
//
//   bash infra/scripts/deploy.sh      (sets ELECTRALENS_NODE and ELECTRALENS_UV, then runs pm2)
const fs = require('node:fs');

const ROOT = process.env.ELECTRALENS_ROOT || '/opt/electralens';
const SHARED = '/etc/electralens/electralens.env';
const ANCHOR = '/etc/electralens/anchor.env'; // the publisher key: only this process reads it
// A private Node 24 for ElectraLens, so the other apps on this server keep their own Node.
const NODE = process.env.ELECTRALENS_NODE || 'node';
const UV = process.env.ELECTRALENS_UV || 'uv';

const common = {
  max_memory_restart: '400M',
  restart_delay: 3000,
  exp_backoff_restart_delay: 200,
  time: true,
  merge_logs: true,
};

// The anchor service needs a deployed registry; until REGISTRY_ADDRESS is set it is not started
// and publications show ANCHOR PENDING.
function anchorConfigured() {
  try {
    return /^REGISTRY_ADDRESS=0x[0-9a-fA-F]{40}\s*$/m.test(fs.readFileSync(ANCHOR, 'utf8'));
  } catch {
    return false;
  }
}

const apps = [
  {
    ...common,
    name: 'electralens-web',
    cwd: `${ROOT}/apps/web`,
    script: 'node_modules/next/dist/bin/next',
    args: 'start --hostname 127.0.0.1 --port 3100',
    interpreter: NODE,
    node_args: `--env-file=${SHARED}`,
    env: { NODE_ENV: 'production' },
  },
  {
    ...common,
    name: 'electralens-api',
    cwd: `${ROOT}/apps/api`,
    script: 'dist/server.js',
    interpreter: NODE,
    node_args: `--env-file=${SHARED}`,
    env: { NODE_ENV: 'production', PORT: '4100' },
  },
  {
    ...common,
    name: 'electralens-worker',
    cwd: `${ROOT}/services/engine`,
    script: UV,
    args: `run --frozen --env-file ${SHARED} el worker`,
    interpreter: 'none',
    max_memory_restart: '1G',
  },
];

if (anchorConfigured()) {
  apps.push({
    ...common,
    name: 'electralens-anchor',
    cwd: `${ROOT}/services/anchor`,
    script: 'dist/server.js',
    interpreter: NODE,
    node_args: `--env-file=${ANCHOR}`,
    env: { NODE_ENV: 'production', ANCHOR_PORT: '4200' },
  });
}

module.exports = { apps };
