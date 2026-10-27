<div align="center">
  <img src="public/logo.png" alt="ElectraLens Logo" width="480" />

  # ElectraLens
  ### Verifiable Civic Intelligence & Electoral Roll Transparency

  [![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
  [![Tests](https://img.shields.io/badge/Tests-14%2F14_Passed-success)](https://github.com/mostlyunstable/electralens)
  [![License](https://img.shields.io/badge/License-MIT-gray)](LICENSE)

  <p align="center">
    <strong>PUBLIC DATA. PUBLIC METHODOLOGY. PUBLIC EVIDENCE. PRIVATE IDENTITIES.</strong>
  </p>
</div>

---

> **Important Notice:** ElectraLens is an independent public-interest civic technology project. It is **not** affiliated with, sponsored by, or endorsed by the Election Commission of India (ECI) or any state electoral authority. All data presented during this hackathon demonstration is purely deterministic synthetic data. An anomaly is never proof of misconduct.

---

## 🏛️ Overview

**ElectraLens** bridges the gap between raw electoral roll publications and public accountability. It gives quarterly roll releases a verifiable public audit trail:
- **Compare Revisions ($T_0 \to T_1$):** Differential analysis classifying additions, deletions, corrections, and net shifts across administrative units.
- **Statistical Discipline:** Applies registered detection rules with Benjamini-Hochberg False Discovery Rate (FDR) adjustments ($q < 0.05$) to control for false positives.
- **Mandatory Counter-Hypotheses:** Every flagged anomaly requires documented benign alternative explanations ($H_1, H_2$) before publication.
- **Independent Cryptographic Verification:** Web Crypto API (SHA-256) calculates canonical document digests in the browser—empowering citizens and journalists to independently verify publication integrity without trusting server claims.
- **Strict Privacy Protections:** Zero voter names, residential addresses, or EPIC numbers are ever exposed. All outputs enforce $k$-anonymity cell suppression.

---

## 🧭 Route Map

### Public Editorial & Research Workspaces
| Route | Description |
| :--- | :--- |
| [`/`](https://origins.armedias.com) | **Editorial Flagship** — Hero passport cards, differential breakdown, 4-pillar methodology, live hash tamper simulation, citizen verification preview, and FAQ. |
| [`/compare`](https://origins.armedias.com/compare) | **Comparison Workspace** — Version selector, addition/deletion ratios, interactive search, and live CSV/JSON data export. |
| [`/findings`](https://origins.armedias.com/findings) | **Findings Directory** — Searchable catalog with signal strength badges and review status flags. |
| [`/findings/[id]`](https://origins.armedias.com/findings/FND-2024-001) | **Finding Detail** — Test specifications, effect sizes, FDR $q$-values, and required counter-hypotheses ($H_1, H_2$). |
| [`/methodology`](https://origins.armedias.com/methodology) | **Methodology Documentation** — Canonicalization RFC, multiple-testing correction mathematical formulation, and rule catalog. |
| [`/claims`](https://origins.armedias.com/claims) | **Claim Checker** — Fact-checking interface evaluating public claims against published aggregate figures. |
| [`/verify/[publication]`](https://origins.armedias.com/verify/PUB-2024-001) | **Publication Verifier** — In-browser SHA-256 recalculation, hash comparison, and interactive single-field tamper simulator. |
| [`/b/[code]`](https://origins.armedias.com/b/SYN-B001) | **Polling Station Registry** — Synthetic booth details, parts served, physical accessibility notes, and print view. |
| [`/sources`](https://origins.armedias.com/sources) | **Data Provenance** — Dataset revision history, publishing dates, and cryptographic hashes. |
| [`/privacy`](https://origins.armedias.com/privacy) | **Privacy Practices** — Mathematical guarantees, anonymization pipeline, and privacy charter. |
| [`/about`](https://origins.armedias.com/about) | **Mission & Scope** — Civic-tech mandate, team independence, and neutrality principles. |

### Restricted Operations Suite (`/ops`)
| Route | Description |
| :--- | :--- |
| `/ops` | Pipeline status overview, cluster health, and pending review queue. |
| `/ops/login` | Analyst credential gate with hardware token (WebAuthn/FIDO2) prompt. |
| `/ops/datasets` | Raw roll snapshot ingestion queue with checksum validation. |
| `/ops/runs/[id]` | Pipeline execution trace, stage durations, and memory profiling. |
| `/ops/review` | Multi-analyst sign-off workflow for statistical findings. |
| `/ops/publications` | Manifest builder enforcing two-person custody before signing. |
| `/ops/audit-log` | Append-only event history with actor attribution. |
| `/ops/settings` | Engine configuration: FDR thresholds ($q < 0.05$) and anomaly sensitivity. |

---

## 🎨 Design System

ElectraLens implements a contemporary editorial design system inspired by high-end investigative journalism and the [OriginX](https://originx.armedias.com/claude-design/Origin%20X%20Landing.html) aesthetic:

- **Saffron Orange (`#F07824`)**: Accent highlights, primary interactive pills, and closing banners.
- **Analytical Blue (`#2864DC`)**: Data visualizations, metric ratios, and active indicators.
- **Verification Green (`#14663F`)**: Cryptographic matches, additions, and integrity status badges.
- **Slate & Charcoal (`#172033`, `#475467`)**: Display serif typography (`Playfair Display`, `Georgia`) and high-legibility UI typography.

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18.17+ or Node 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/mostlyunstable/electralens.git
cd electralens

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🧪 Testing & Verification

ElectraLens includes a rigorous automated test suite verifying claim logic, statistical consistency, and cryptographic hashing:

```bash
# Run unit tests
npm test

# Run production build
npm run build
```

Test coverage includes:
- **Claim Checker Verdict Logic:** Tolerance thresholds, contradicted evaluations, and refusal to process intent/fraud claims.
- **Dataset Consistency:** Net change arithmetic ($T_0 + \text{Additions} - \text{Deletions} = T_1$), breakdown sums, and 64-character SHA-256 seed strings.
- **Cryptographic Verification:** RFC 8785 JSON canonicalization, Web Crypto SHA-256 hashing, and single-field tamper detection.

---

## 🔒 Privacy Charter

1. **Zero Citizen PII:** No names, phone numbers, Aadhaar numbers, or voter ID (EPIC) numbers are collected or published.
2. **Deterministic Aggregation:** Data is aggregated to polling-station and assembly-constituency levels.
3. **$k$-Anonymity Cell Suppression:** Cells with $n < 10$ individuals are masked to prevent demographic reconstruction.
4. **Local Browser Computation:** Independent verification executes locally on client hardware with zero telemetry or tracking.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
