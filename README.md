# Agent Enterprise OS

File-based **Company OS** harness: `AGENTS.md` + `SKILL.md` + wiki/SOPs + correction → eval + traces.

Not a multi-agent orchestration platform. No Nova suite. One money loop first.

## Layout

```text
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

`market-research` → `sales-outbound` (draft only; human `APPROVE_SEND`).

Clone later: `eng-pr`. Do not add a C-suite of autonomous departments until loop #1 is boring.

## Stack

| Layer | Use |
|---|---|
| Always-on / learning | Hermes Agent |
| Eng artifacts | OpenCode or OpenHands |
| Skills | This repo (+ audited packs later) |
| Correction → skill | ACE optional + `scripts/record-correction.sh` |
| Traces | Langfuse or `traces/*.md` |
| Verifier | Promptfoo (`evals/promptfoo.yaml`) |

## Quick start

See [SETUP.md](./SETUP.md).

```bash
chmod +x scripts/record-correction.sh
# Point Hermes / OpenCode at this repo root; it loads AGENTS.md
```
