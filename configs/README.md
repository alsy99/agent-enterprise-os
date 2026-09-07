# Harness model configs

**Week 1 (no LiteLLM):** use repo-root `opencode.json` + `configs/hermes.env.direct.example` with `.env` keys.
Point Hermes/OpenCode cwd at the **repo root** so `AGENTS.md` and `skills/` load.

**Later (proxy):** `opencode.models.example.json` + `hermes.env.example` require LiteLLM on `:4000` — see `integrations/models/README.md`. Only after a raw Google/Groq call works.