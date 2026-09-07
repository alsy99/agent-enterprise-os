# agent-enterprise-os

This repository contains **two separate things**. Do not mix them.

## 1. Company OS (this project’s harness) — `company/`

File-based operating system for agents:

- `AGENTS.md` + `SKILL.md`
- `wiki/` + `sops/`
- correction → eval
- traces + Promptfoo verifier

**Start here:** [company/README.md](./company/README.md) · [company/SETUP.md](./company/SETUP.md)

Week-1 loop: **research → draft outreach (never send)**.  
Not in weeks: full market/sales/product/design/eng/ops autonomy.

## 2. Agent Suite (separate product) — repo root Next.js app

Forever-online **orchestrator-workers** demo (Nova + workers, Beacon UI). Built in a different thread. It is **not** Company OS.

```bash
npm install
npm run dev   # http://127.0.0.1:43123
```

See root historical docs for Suite deploy. Do not treat Suite as the company brain.

## Rule

Steal Hermes/OpenCode + skills files. Do not build another orchestrator to “be the company.”
