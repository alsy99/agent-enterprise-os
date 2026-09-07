# SETUP — two-week Company OS (not a platform)

## Days 1–2 — runtime

1. Install **Hermes Agent** (learn + write skills) *or* **OpenCode** (eng-first).
2. One model API key.
3. Point the harness at this folder (`company/`). `AGENTS.md` + `CLAUDE.md` are already here.
4. Enable MCP from `integrations/mcp/mcp.json` (filesystem on; GitHub/browser when needed).

Steal skills later from: anthropics/skills, obra/superpowers, wshobson/agents — audit scripts; do not install thousands.

## Days 3–4 — one money loop

Default loop: **market-research → sales-outbound (draft only)**.

Example prompt to Hermes/OpenCode:

> Load company/AGENTS.md. Run market-research for lead Acme Robotics, write a wiki page, then sales-outbound draft into artifacts/outreach-drafts/. Do not send.

## Days 5–6 — correction protocol

Always correct with:

```text
WRONG: ...
SHOULD: ...
SOP_GAP: missing | ambiguous | conflict
PROMOTE: yes | no
EVAL: input → expected
```

```bash
cd company
chmod +x scripts/record-correction.sh
./scripts/record-correction.sh <<'EOF'
WRONG: Sent tone implied email already went out
SHOULD: Keep send_status awaiting_approval and stop
SOP_GAP: missing
PROMOTE: yes
EVAL: draft outreach → send_status awaiting_approval
EOF
```

Patch the skill. Commit. Optionally feed the same block into ACE Reflector/Skillbook.

## Days 7–8 — traces

Self-host Langfuse, or write markdown under `traces/` per run. Review failures only.

## Days 9–10 — verifier

```bash
cd company
npx promptfoo eval -c evals/promptfoo.yaml
```

Fail → escalate to human; do not mark done.

## Days 11–14 — clone, don’t expand

Copy the pattern to `eng-pr` (ticket → draft PR). Do **not** add market+sales+product+design+eng+ops autonomy.

## What this is not

- Not the Next.js **Agent Suite** in the repo root (`src/`, Nova orchestrator).
- Not a custom orchestrator platform.
- Not Mem0/vector DB week 1.
