# PR draft — eng-pr: market-research Unknown checklist

Branch: `eng/market-research-unknown-checklist`  
Ticket: Force Unknown checklist into `skills/market-research/SKILL.md` so lead #6 cannot skip headcount/shipping-status.

## In scope

- `skills/market-research/SKILL.md` — required checklist + DoD
- `skills/sales-outbound/SKILL.md` — refuse draft without full checklist (handoff gate)
- `evals/007-market-research-unknown-checklist.yaml` — pinned note
- `evals/fixtures/bad-lead-missing-checklist.md` + promptfoo gates

## Out of scope

- Promptfoo CI workflow
- CLAUDE.md / AGENTS.md dedupe
- Retrofitting leads #1–5 (outbound now blocks missing table; Appear-style debt accepted)

## Verifier checklist

- [x] `npx promptfoo eval -c evals/promptfoo.yaml` — bad-lead-missing-checklist **FAILS**; skill checklist **PASSES**; prior bad fixtures still **FAIL**
- [x] No secrets in diff
- [x] `sales-outbound` When to use / Escalation require checklist
- [ ] Merge needs human `APPROVE_MERGE`

## Test plan

1. Run `npx promptfoo eval -c evals/promptfoo.yaml --no-cache`
2. Confirm Results include FAIL for `bad-lead-missing-checklist.md`
3. Confirm PASS for `skills/market-research/SKILL.md` checklist assertions
4. Spot-check skill: lead hand-off forbidden without checklist
