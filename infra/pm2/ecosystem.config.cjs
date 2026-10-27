// pm2 processes for ElectraLens on the VPS (S8). Everything listens on 127.0.0.1; host nginx is
// the only public entry point. Secrets live only in /etc/electralens/*.env (root, chmod 600),
// passed to each process with --env-file and never committed.
//
//   pm2 startOrReload infra/pm2/ecosystem.config.cjs && pm2 save
const ROOT = process.env.ELECTRALENS_ROOT || '/opt/electralens';
const SHARED = '/etc/electralens/electralens.env';
const ANCHOR = '/etc/electralens/anchor.env'; // the publisher key: only this process reads it

const common = {
  max_memory_restart: '400M',
  restart_delay: 3000,
  exp_backoff_restart_delay: 200,
  time: true,
  merge_logs: true,
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'electralens-web',
      cwd: `${ROOT}/apps/web`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3100',
      node_args: `--env-file=${SHARED}`,
      env: { NODE_ENV: 'production' },
    },
    {
      ...common,
      name: 'electralens-api',
      cwd: `${ROOT}/apps/api`,
      script: 'dist/server.js',
      node_args: `--env-file=${SHARED}`,
      env: { NODE_ENV: 'production', PORT: '4100' },
    },
    {
      ...common,
      name: 'electralens-anchor',
      cwd: `${ROOT}/services/anchor`,
      script: 'dist/server.js',
      node_args: `--env-file=${ANCHOR}`,
      env: { NODE_ENV: 'production', ANCHOR_PORT: '4200' },
    },
    {
      ...common,
      name: 'electralens-worker',
      cwd: `${ROOT}/services/engine`,
      script: 'uv',
      args: `run --frozen --env-file ${SHARED} el worker`,
      interpreter: 'none',
      max_memory_restart: '1G',
    },
  ],
};
