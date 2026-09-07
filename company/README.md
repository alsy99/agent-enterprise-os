# Company OS

File-based company harness: **AGENTS.md + SKILL.md + wiki/sops + correction → eval + traces**.

This is **not** the multi-agent orchestration suite in the repo root. No C-suite platform. One money loop first.

## Layout

```text
company/
  AGENTS.md
  CLAUDE.md -> AGENTS.md
  skills/
    market-research/SKILL.md
    sales-outbound/SKILL.md
    eng-pr/SKILL.md
    support-l1/SKILL.md
  wiki/
  sops/
  evals/
  traces/
  memory/
  integrations/mcp/
  artifacts/
  scripts/record-correction.sh
  SETUP.md
```

## Week-1 loop

`market-research` → `sales-outbound` (draft only, human `APPROVE_SEND`).

Second loop to clone later: `eng-pr`.

## Stack (use, don’t rebuild)

| Layer | Pick |
|---|---|
| Always-on / learning | Hermes Agent |
| Eng artifacts | OpenCode or OpenHands |
| Skills | This folder + anthropics/skills / superpowers (audited) |
| Correction → skillbook | ACE (optional) + `scripts/record-correction.sh` |
| Traces | Langfuse (or `traces/*.md`) |
| Verifier | Promptfoo (`evals/promptfoo.yaml`) |

## Quick start

See [SETUP.md](./SETUP.md).

```bash
chmod +x scripts/record-correction.sh
# Point Hermes/OpenCode at this directory; load AGENTS.md
```
