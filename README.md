# Agent Suite — Forever Online

Self-learning, forever-running multi-agent system. **Nova** is the orchestrator: she accepts a single task brief, plans with Skills, and routes workers.

Designed against Anthropic’s guidance:

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## Guidelines we follow

| Principle | How this suite applies it |
|---|---|
| Prefer simple, composable patterns | Nova uses **orchestrator-workers**; review skill documents **evaluator-optimizer** |
| Transparency | Plans, assignment “why”, and handoffs are persisted and shown in History |
| Progressive disclosure (Skills) | `skills/*/SKILL.md` — metadata for discovery; full instructions load only when a step runs |
| Description = what + when | Every Skill frontmatter states both so Nova can match briefs |
| Start simple | Single task input; default pipeline is research → (specialists) → implement → review → learn |
| Guardrails + stopping conditions | Per-agent guardrails; spawn caps; one worker turn per tick |

## What it does

- **Wake on start** — boots with the Next.js server or `npm run worker`
- **Forever-online agents** — Nova, Kai, Remy, Sable, Iori (+ specialists) wait their turn
- **Skills-based routing** — Nova matches the brief to Skill metadata, then loads instructions per turn
- **Dynamic spawn** — missing capabilities create specialists
- **Learning + handoffs** — SQLite memory, playbooks, History view

## Quick start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm run worker   # standalone forever process
```

```bash
curl -X POST http://127.0.0.1:43123/api/objectives \
  -H 'content-type: application/json' \
  -d '{"task":"Write a short onboarding guide with a security pass"}'
```

List Skills (Level 1 metadata): `GET /api/skills`

## Skills layout

```
skills/
  nova-orchestrate/SKILL.md
  research/SKILL.md
  implement/SKILL.md
  review/SKILL.md
  learn/SKILL.md
  security-pass/SKILL.md
  docs/SKILL.md
```

Each file uses Claude-style YAML frontmatter (`name`, `description`) plus instructions. Add a new folder + `SKILL.md` and Nova can discover it on the next plan.

## Architecture

| Piece | Role |
|---|---|
| `skills/` | Filesystem Agent Skills (progressive disclosure) |
| `src/lib/suite/skills.ts` | Metadata listing, match-by-description, on-trigger load |
| `src/lib/suite/orchestrator.ts` | Nova planning + worker turns |
| `src/lib/suite/worker.ts` | Forever tick loop |
| `src/lib/suite/store.ts` | SQLite agents/tasks/memory/handoffs |
| Dashboard | Ongoing · History · Agents |

State: `data/suite.db`

## Notes

- Local deterministic runtime (no API key required) so the forever loop always runs.
- Learning is playbook + memory persistence — ready to swap worker turns for Claude later while keeping the same Skills ACI.
