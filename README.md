# Agent Suite — Forever Online

Self-learning, forever-running multi-agent system with an orchestrator that routes objectives, spawns missing specialists, and persists context for handoffs.

## What it does

- **Wake on start** — the suite boots when the Next.js server (or `npm run worker`) starts
- **Forever-online agents** — built-in Orchestrator, Researcher, Builder, Reviewer, Learner stay waiting their turn
- **Dynamic spawn** — if no agent covers a capability, the orchestrator creates a specialist (try `[cap:security]` in an objective)
- **Per-agent rules & guardrails** — each agent has its own constraints
- **Learning** — outcomes become lessons + playbook updates in SQLite
- **Handoffs** — agents pass persistent context to the next specialist

## Quick start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

### Standalone forever worker (machine-on / process manager)

```bash
npm run worker
```

Point `systemd`, `launchd`, or `pm2` at `npm run worker` so the suite wakes whenever the system is on.

### Cloud agents

Run the dashboard/API in the cloud, then either:

1. Keep `npm run worker` (or the embedded worker inside `npm run dev` / `npm start`) alive, or
2. Have a Cursor Cloud Agent POST objectives to `/api/objectives` and tick via `/api/worker`

Example:

```bash
curl -X POST http://127.0.0.1:43123/api/objectives \
  -H 'content-type: application/json' \
  -d '{"title":"Ship onboarding checklist","description":"Create a concrete first slice [cap:docs]","priority":2}'
```

## Architecture

| Piece | Role |
|---|---|
| `src/lib/suite/orchestrator.ts` | Route work, spawn agents, execute turns |
| `src/lib/suite/worker.ts` | Forever tick loop + wake-on-start |
| `src/lib/suite/store.ts` | SQLite persistence (agents, tasks, memory, handoffs) |
| `src/lib/suite/templates.ts` | Built-in specs + auto-invented specialists |
| `scripts/worker.ts` | Standalone process for always-on hosts |
| Dashboard | Dispatch objectives, inspect agents/learning/handoffs |

State lives in `data/suite.db` (created automatically).

## Notes

- This slice uses a deterministic local runtime (no API key required) so the forever loop is always runnable.
- Learning is playbook + memory persistence across restarts — the foundation for richer model-backed reasoning later.
- Guardrail `no-infinite-spawn` caps duplicate types unless all peers are busy.
