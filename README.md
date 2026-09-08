# Agent Enterprise OS

File-based **Company OS** harness: agents compound corrections into skills, SOPs, and evals.

Not a multi-agent chat demo. Not “autonomous C-suite by Friday.”

**Charter:** [VISION.md](./VISION.md) (source of truth) · [org/CHARTER.md](./org/CHARTER.md) (quarter scope)

## Layout

```text
VISION.md                 # what we are building + how agents may work
AGENTS.md                 # runtime never-do / always-do (short)
CLAUDE.md                 # must stay byte-equivalent to AGENTS.md
org/
  CHARTER.md
  pm/SKILL.md             # orchestrator — workers do not call workers
objectives/
  _TEMPLATE.md
  YYYY-MM-DD-<slug>.md
skills/
  market-research/SKILL.md
  sales-outbound/SKILL.md
  eng-pr/SKILL.md
  support-l1/SKILL.md
wiki/
sops/
  handoff-reject.md
evals/
traces/
artifacts/
integrations/models/
scripts/
SETUP.md
```

## Default loop (Phase 1)

PM owns an objective → `market-research` → PM check (Unknown checklist) → `sales-outbound` (draft) → human `APPROVE_SEND`.

Clone later: `eng-pr` + QA under CTO. Empty CXO seats are forbidden until that function has a worker + eval + artifact type.

## Stack

| Layer | Use |
|---|---|
| Always-on / learning | Hermes Agent |
| Eng artifacts | OpenCode or OpenHands |
| Skills | This repo (+ audited packs later) |
| Models | `integrations/models/` — planner / worker / verifier (LiteLLM) |
| Correction → skill | ACE optional + `scripts/record-correction.sh` |
| Traces | Langfuse or `traces/*.md` |
| Verifier | Promptfoo (assertion linter) + Groq second opinion |

## Models (week 1)

Do not pick one model. Route by job:

- **Worker:** Gemini Flash-Lite  
- **Planner:** Gemini Flash  
- **Verifier:** Groq `openai/gpt-oss-120b` (different family)  
- **Coder (when needed):** Mistral Codestral (free); NIM Nemotron Super as trial alternate  

Details: [integrations/models/README.md](./integrations/models/README.md) · `.env.example`

## Quick start

See [SETUP.md](./SETUP.md).

```bash
chmod +x scripts/record-correction.sh
# Point Hermes / OpenCode at this repo root; it loads AGENTS.md
# PM / CXO / CEO turns also read VISION.md + org/CHARTER.md + objectives/
```
