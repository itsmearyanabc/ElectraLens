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
ss -ltnp | grep -E ':(3100|4100|4200) ' || echo "ports free"
git clone https://github.com/itsmearyanabc/ElectraLens.git /opt/electralens
bash /opt/electralens/infra/scripts/install-tools.sh   # private Node 24, pnpm, uv
bash /opt/electralens/infra/scripts/setup-env.sh       # asks for each value, writes /etc/electralens/*.env
```

The system Node used by the other pm2 apps is not changed. The anchor service starts only once
`REGISTRY_ADDRESS` is set (re-run `setup-env.sh` after the Hoodi deployment).

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

## 6. Web server and HTTPS

On this VPS Caddy owns ports 80 and 443. `first-install.sh` copies `infra/caddy/electralens.caddy`
to `/etc/caddy/`, adds `import /etc/caddy/electralens.caddy` to the Caddyfile (backed up as
`Caddyfile.before-electralens`), validates and reloads; Caddy gets the certificate itself.
On a host with nginx instead:

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

## 8. Registry on Hoodi (done)

`ElectraLensRegistry` is at `0x33dDc801030b62066f731289de0FBB5D38Ee4aA8` (deploy block 3898610),
admin `0xb7Bf3660FbC34D8B979beb9544a4B3977d00a8e1` (key in `secrets/admin_private_key`, kept off
the server), publisher `0x765eE9a8194aE69f244561777BB30Fe4E885F3cB`. `anchor.env` holds the
registry address, deploy block and publisher key; `electralens.env` holds
`NEXT_PUBLIC_REGISTRY_ADDRESS`. Both files must carry the same `ANCHOR_HMAC_KEY`.

A publication approved before the registry existed is anchored with:

```bash
cd /opt/electralens && /opt/electralens-node/bin/node --env-file=/etc/electralens/electralens.env   infra/scripts/anchor-publication.mjs <publication-id>
```

## 9. AI explanations

`GEMINI_API_KEY` in `electralens.env` turns on "Explain with AI" on finding pages (server-side
only; overloaded models fall back to lighter Flash models). After changing it:
`pm2 restart electralens-web --update-env`. Failures are logged as `AI explainer: …` in
`pm2 logs electralens-web`.

## Demo data on the live site

Publication DEMO-HR #1 was loaded with `el demo-sql` (rows applied with
`npx supabase db query --linked -f data/demo/publish/demo.sql`), its public files uploaded with
`infra/scripts/upload-demo-artifacts.sh` (the exact bytes in `infra/demo/`), then anchored as
above. Further publications go through the real pipeline: data steward uploads, analyst runs,
reviewer reviews, two people approve, and the anchor follows the second approval.
`pnpm demo:reset` is for local machines only and refuses to touch the cloud.
