# SOP — Handoff reject (PM bounce-back)

**Updated:** 2026-09-08  
**Owner:** PM  
**Related:** `VISION.md` §7.3, `org/pm/SKILL.md`, `skills/sales-outbound/SKILL.md`

## Rule

Missing checklist / tests / `send_status` = refuse and bounce. Do not “fix forward” by drafting anyway.

## GTM: research → sales

PM may start `sales-outbound` only if the lead page contains:

```markdown
## Unknown checklist

| Field | Value |
|---|---|
| Headcount / team size (ICP 1–5?) | … |
| Shipping status of cited features (GA / beta / coming soon) | … |
| Decision-maker path | … |
| Timeline ≤90 days | … |
| Willingness to talk / design-partner interest | … |
```

| Failure | Action |
|---|---|
| No `## Unknown checklist` | `blocked` → bounce `market-research` |
| Missing any of the five rows | `blocked` → bounce `market-research` |
| Row present but empty cell | `blocked` → bounce `market-research` |
| Sales draft without `send_status: awaiting_approval` | `blocked` → bounce `sales-outbound` |
| Language implying already sent | fail critic; do not escalate as ready |

`sales-outbound` must also refuse the same missing table (skill-level gate). PM is the supervisor; the skill is the second lock.

## Eng (later)

- eng-pr cannot mark ready without QA/eval when `skills/qa/` exists.
- Deploy cannot start without `APPROVE_DEPLOY` on the objective.

## Recording

On reject: update objective `status: blocked`, fill `## Blockers` with `node: reason → bounce to <skill>`, write a `traces/runs/` line.
