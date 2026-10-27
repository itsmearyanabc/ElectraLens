# ElectraLens

AI-assisted electoral-roll transparency: compare roll versions, surface statistical anomalies for human review, explain them in plain language, and publish tamper-evident evidence. Built for PS 1 — AI for Electoral Roll Transparency.

> **Independent project.** ElectraLens is not affiliated with, endorsed by, or acting for the Election Commission of India. All demo data is synthetic. An anomaly is a reason to look closer, never proof of wrongdoing.

**Core principle:** public data, public methodology, public evidence, private identities.

## Status

Under construction. The build follows the checklist in [docs/05-TECHNICAL-ARCHITECTURE.md](docs/05-TECHNICAL-ARCHITECTURE.md).

## Documentation

| Document                                                               | Contents                                  |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [docs/01-PRD.md](docs/01-PRD.md)                                       | Product requirements                      |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md)                     | System architecture                       |
| [docs/03-THREAT-MODEL.md](docs/03-THREAT-MODEL.md)                     | Threat model and privacy review           |
| [docs/04-ROADMAP.md](docs/04-ROADMAP.md)                               | Roadmap, 24-hour schedule, open decisions |
| [docs/05-TECHNICAL-ARCHITECTURE.md](docs/05-TECHNICAL-ARCHITECTURE.md) | Technical design and build checklist      |

## Repository layout

```
apps/web          Next.js public portal, citizen pages, operations console
apps/api          Fastify REST API
services/anchor   Blockchain anchoring service (holds the testnet publisher key)
services/engine   Python audit engine: synthetic data, canonicalisation, rules, worker
packages/*        Shared TypeScript: canonicaliser, schemas, translations
contracts         Solidity registry (Hardhat)
supabase          Database migrations, seed data, RLS tests
test-vectors      Canonicalisation vectors shared by Python and TypeScript
infra             Docker Compose, nginx, backups, deploy scripts
```

## Prerequisites

- Node.js 24 and pnpm 12 (`npm install -g pnpm`)
- [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for the engine)
- Docker Desktop, running (for the local Supabase stack)

## Quick start

```bash
pnpm install
pnpm engine:sync
cp .env.example .env
npx supabase start
pnpm check
```

`pnpm check` runs lint, formatting, type checks and tests for both the TypeScript workspace and the Python engine.

## Licence

[Apache-2.0](LICENSE)
