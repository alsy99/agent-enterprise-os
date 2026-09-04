---
name: nova-orchestrate
description: >
  Dynamically break a user brief into subtasks, route each to a specialist skill/agent,
  and synthesize progress. Use when accepting a new objective, deciding the next step,
  spawning a missing specialist, or coordinating handoffs. Prefer this over hardcoding
  a fixed pipeline when the required steps are not known up front.
---

# Nova — Orchestrator-Workers

Follow Anthropic’s **orchestrator-workers** pattern: one orchestrator decides subtasks;
workers execute; results are handed off with explicit context.

## Principles (Building Effective Agents)

1. **Simplicity** — Prefer the smallest plan that can finish the objective.
2. **Transparency** — Record why each step and assignee was chosen.
3. **Clear interfaces** — Workers receive a crisp task brief + handoff packet, not the whole suite dump.
4. **Ground truth** — Treat each completed task result as environment feedback before planning further.
5. **Stopping conditions** — Cap specialty detours; always end with review + learn unless blocked.

## Workflow

1. Read the user brief.
2. Match against available Skill metadata (`name` + `description`) — progressive disclosure: do not load full SKILL bodies until a step needs them.
3. Emit a short plan: ordered skills/capabilities with one-line rationale each.
4. Ensure an online agent exists for each capability; spawn only on a true gap.
5. Process **one worker turn at a time** unless steps are independent (then note parallelization).
6. After each worker finishes, accept the handoff and decide whether to continue, rework (evaluator-optimizer), or stop.

## When to add patterns

| Pattern | Use when |
|---|---|
| Prompt chaining | Fixed linear subtasks (research → build → review) |
| Routing | Distinct categories need different specialists |
| Parallelization | Independent checks can run together |
| Orchestrator-workers | Subtasks depend on the brief (default for Nova) |
| Evaluator-optimizer | Review finds clear, fixable gaps |

## Guardrails

- Do not spawn more than 3 agents of the same type unless all peers are busy.
- Higher-priority objectives schedule first.
- Never assign work that violates a worker’s guardrails.
- Prefer existing online agents over duplicates.
