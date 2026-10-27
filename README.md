# ElectraLens

**AI-assisted electoral-roll transparency:** compare roll versions, surface statistical anomalies for human review, explain them in plain language, and publish tamper-evident evidence. Built for PS 1 — AI for Electoral Roll Transparency.

> **Independent civic-tech project.** ElectraLens is not affiliated with, endorsed by, or acting for the Election Commission of India. All demonstration data is synthetic and clearly marked. An anomaly is a reason to look closer, never proof of wrongdoing.

**Core principle:** public data, public methodology, public evidence, private identities.

---

## 🌟 Interactive Frontend Portal (`/frontend`)

The primary civic portal and editorial audit suite is located in [`frontend/`](./frontend). It features a high-fidelity OriginX design system, interactive statistical tooling, and deterministic verification:

* 🏛️ **3D Sovereign Canvas**: Interactive Three.js & Canvas visualization for civic engagement.
* 📊 **Revision Delta Comparison Workspace (`/compare`)**: Granular inspection of additions, deletions, and corrections across draft and final roll revisions.
* 🚩 **Statistical Anomaly Directory (`/findings`)**: Automated Benjamini-Hochberg False Discovery Rate (FDR) audit signals documenting multiple plausible hypotheses.
* ⚖️ **Epistemic Claim Verification Engine (`/claims`)**: Natural-language fact-checking engine that tests claims against mathematical deltas and enforces strict epistemic boundaries (separating numbers from motive/fraud allegations).
* 🔒 **In-Browser Cryptographic Verifier (`/verify`)**: Zero-server trust verification using W3C Web Crypto (`SHA-256`) and RFC-8785 canonical JSON sorting, including **drag-and-drop custom `.json` manifest upload**.
* 📄 **Formal PDF Audit Dossier**: Vector-crisp `@media print` print layout for formal evidence archiving and physical dossier printing.
* 🇮🇳 **Complete Bilingual Support**: Full English (`en`) and Hindi (`hi`) locale toggling across all public and operations pages.

### Quick Start: Frontend Only

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the live interface.

---

## Repository Layout

```
frontend/         Next.js 16 Editorial Web Portal & 3D Interactive Client
apps/web          Next.js public portal, citizen pages, operations console
apps/api          Fastify REST API (Port 4100)
services/anchor   Blockchain anchoring service (holds the testnet publisher key)
services/engine   Python audit engine: synthetic data, canonicalisation, rules, worker
packages/*        Shared TypeScript: canonicaliser, schemas, translations
contracts         Solidity registry (Hardhat)
supabase          Database migrations, seed data, RLS tests
test-vectors      Canonicalisation vectors shared by Python and TypeScript
infra             Docker Compose, nginx, backups, deploy scripts
```

## Documentation

| Document | Contents |
| --- | --- |
| [docs/01-PRD.md](docs/01-PRD.md) | Product requirements |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | System architecture |
| [docs/03-THREAT-MODEL.md](docs/03-THREAT-MODEL.md) | Threat model and privacy review |
| [docs/04-ROADMAP.md](docs/04-ROADMAP.md) | Roadmap, 24-hour schedule, open decisions |
| [docs/05-TECHNICAL-ARCHITECTURE.md](docs/05-TECHNICAL-ARCHITECTURE.md) | Technical design and build checklist |
| [docs/06-FRONTEND.md](docs/06-FRONTEND.md) | Frontend UX & OriginX design specifications |

## Backend & Monorepo Prerequisites

- Node.js 24 and pnpm 12 (`npm install -g pnpm`)
- [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for the engine)
- Docker Desktop, running (for the local Supabase stack)

## Full Monorepo Quick Start

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Sync python engine
pnpm engine:sync

# 3. Configure environment
cp .env.example .env

# 4. Start local Supabase & test suite
npx supabase start
pnpm check
```

`pnpm check` runs lint, formatting, type checks, and tests across the TypeScript workspace and the Python engine.

## Licence

[Apache-2.0](LICENSE)
