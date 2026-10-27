# ElectraLens runbook: deploying to the VPS

ElectraLens runs on the Hostinger VPS next to the other apps, under pm2, behind the host nginx at
**https://electralens.armedias.com**. Four processes, all bound to 127.0.0.1:

| pm2 name | What | Port |
|---|---|---|
| `electralens-web` | Website and console (Next.js) | 3100 |
| `electralens-api` | API (Fastify) | 4100 |
| `electralens-anchor` | Anchor service (holds the publisher key) | 4200, never proxied |
| `electralens-worker` | Job worker (Python, uv) | none |

Secrets live only in `/etc/electralens/electralens.env` and `/etc/electralens/anchor.env`
(root, chmod 600). The admin login is set there too and nowhere else.

## 1. One-time server setup

```bash
# Ports must be free (ORIGINX uses 8080/8443; check the others).
ss -ltnp | grep -E ':(3100|4100|4200) ' || echo "ports free"

# Tools: Node 24, pnpm through corepack, uv, pm2 (already installed).
node --version
corepack enable && corepack prepare pnpm@12.15.0 --activate
curl -LsSf https://astral.sh/uv/install.sh | sh

git clone https://github.com/itsmearyanabc/ElectraLens.git /opt/electralens
mkdir -p /etc/electralens && chmod 700 /etc/electralens
cp /opt/electralens/infra/env/electralens.env.example /etc/electralens/electralens.env
cp /opt/electralens/infra/env/anchor.env.example /etc/electralens/anchor.env
chmod 600 /etc/electralens/*.env
nano /etc/electralens/electralens.env   # fill in values, including the admin email and password
nano /etc/electralens/anchor.env
```

`ANCHOR_HMAC_KEY` must be the same in both files (`openssl rand -hex 32`).

## 2. Database (Supabase cloud), from your own machine

```bash
npx supabase login
npx supabase link --project-ref iuupravfeffusjydzeyt
npx supabase db push --include-seed   # migrations plus areas and methodology 2026.1
```

Then in the Supabase dashboard: **Auth → URL configuration**, set the site URL to
`https://electralens.armedias.com` and add `https://electralens.armedias.com/auth/callback` to the
redirect URLs. Copy the session pooler connection string into `DATABASE_URL`.

## 3. Registry on Hoodi (needs test ETH)

Fund the publisher wallet, then from your machine (`contracts/`):

```bash
npx hardhat ignition deploy ignition/modules/Registry.ts --network hoodi --parameters ignition/parameters/hoodi.json
```

Put the address and deploy block into `REGISTRY_ADDRESS`, `REGISTRY_DEPLOY_BLOCK` (anchor.env) and
`NEXT_PUBLIC_REGISTRY_ADDRESS` (electralens.env). Until this is done the site works, and
publications show ANCHOR PENDING.

## 4. Deploy

```bash
cd /opt/electralens
bash infra/scripts/deploy.sh
```

Re-run the same command for every update.

## 5. Staff accounts (from the environment)

```bash
cd /opt/electralens
node --env-file=/etc/electralens/electralens.env apps/api/dist/bootstrap.js
```

It creates the admin and any demo staff set in the env file, grants their roles, and never prints
a password. Change a password in the env file and run it again to update it. Each person scans
the authenticator QR code at their first sign-in to `/en/ops/login`.

## 6. nginx and HTTPS

```bash
cp /opt/electralens/infra/nginx/electralens.conf /etc/nginx/sites-available/electralens.conf
ln -s /etc/nginx/sites-available/electralens.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d electralens.armedias.com
```

Add a DNS **A record** for `electralens` pointing at the VPS before running certbot.

## 7. Check

```bash
pm2 list | grep electralens
curl -s https://electralens.armedias.com/api/v1/publications | head -c 200
pm2 logs electralens-worker --lines 20
```

## Demo data on the live site

The demo is made through the real pipeline, as the judges would see it: sign in as the data
steward, create two roll versions and upload `roll_v1.csv` and `roll_v2.csv` (from `el generate`),
approve them, then analyst → reviewer → publisher. `pnpm demo:reset` is for local machines only
and refuses to touch the cloud.
