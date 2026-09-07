# SETUP — two-week Company OS (not a platform)

## Days 1–2 — runtime + models

1. Install **Hermes Agent** (learn + write skills) *or* **OpenCode** (eng-first).
2. Copy `.env.example` → `.env`. Fill at least `GOOGLE_API_KEY` + `GROQ_API_KEY`.
3. Point the harness at this **repo root**. `AGENTS.md` + `CLAUDE.md` are here.
4. Enable MCP from `integrations/mcp/mcp.json` (filesystem on; GitHub/browser when needed).
5. Wire models (route by job — see `integrations/models/`):

```bash
cp .env.example .env   # fill keys
# Install once:
#   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup
#   brew install anomalyco/tap/opencode
#   uv tool install 'litellm[proxy]' --with prisma
#   npm i -g promptfoo
# optional proxy (unset DATABASE_URL until Prisma client is generated):
set -a && source .env && set +a
unset DATABASE_URL   # week-1: master_key auth only; virtual keys need Prisma+DB
litellm --config integrations/litellm/config.yaml --port 4000
# OpenCode: repo-root opencode.json (direct) or configs/opencode.models.example.json (via LiteLLM)
# Hermes:  source configs/hermes.env.example  OR hermes config (gemini + keys in ~/.hermes/.env)
# Run Hermes/OpenCode with cwd = this repo root so AGENTS.md + skills/ load
./scripts/resolve-model.sh market-research
./scripts/resolve-model.sh sales-outbound verifier
```
**Week-1 defaults:** Flash-Lite = worker, Flash (`gemini-3.6-flash`) = planner, Groq gpt-oss = verifier. Coder = Codestral (free). Add NIM Nemotron Super only when coding quality bottlenecks.

Steal skills later from: anthropics/skills, obra/superpowers, wshobson/agents — audit scripts; do not install thousands.

## Days 3–4 — one money loop

Default loop: **market-research → sales-outbound (draft only)**.

Example prompt:

> Load AGENTS.md. Run market-research for lead Clay, write a wiki page, then sales-outbound draft into artifacts/outreach-drafts/. Do not send.

## Days 5–6 — correction protocol

Always correct with:

```text
WRONG: ...
SHOULD: ...
SOP_GAP: missing | ambiguous | conflict
PROMOTE: yes | no
EVAL: input → expected
EVAL_ID: 007
```

`EVAL_ID` is required when `PROMOTE: yes` — pin the next free three-digit id by hand (gaps like missing `004` are fine).

```bash
chmod +x scripts/record-correction.sh
./scripts/record-correction.sh <<'EOF'
WRONG: Sent tone implied email already went out
SHOULD: Keep send_status awaiting_approval and stop
SOP_GAP: missing
PROMOTE: yes
EVAL: draft outreach → send_status awaiting_approval
EVAL_ID: 005
EOF
```

Patch the skill. Commit. Optionally feed the same block into ACE Reflector/Skillbook.

## Days 7–8 — traces

Self-host Langfuse, or write markdown under `traces/` per run. Review failures only.

## Days 9–10 — verifier

```bash
npx promptfoo eval -c evals/promptfoo.yaml
```

Fail → escalate to human; do not mark done.

## Days 11–14 — clone, don’t expand

Copy the pattern to `eng-pr` (ticket → draft PR). Do **not** add market+sales+product+design+eng+ops autonomy.

## What this is not

- Not a custom multi-agent orchestrator
- Not Mem0/vector DB week 1
- Not OpenClaw-as-company-brain (channels only, later)
