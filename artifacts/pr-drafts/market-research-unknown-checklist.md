# PR draft — eng-pr: market-research Unknown checklist

Branch: `eng/market-research-unknown-checklist`  
Ticket: Force Unknown checklist into `skills/market-research/SKILL.md` so lead #6 cannot skip headcount/shipping-status.

## In scope

- `skills/market-research/SKILL.md` — required checklist + DoD
- `evals/007-market-research-unknown-checklist.yaml` — pinned note
- `evals/fixtures/bad-lead-missing-checklist.md` + promptfoo gates

## Out of scope

- Promptfoo CI workflow
- CLAUDE.md / AGENTS.md dedupe
- Retrofitting all five existing lead pages to the new table (lead #6+ must comply)

## Verifier checklist

- [x] `npx promptfoo eval -c evals/promptfoo.yaml` — bad-lead-missing-checklist **FAILS**; skill checklist **PASSES**; prior bad fixtures still **FAIL**
- [x] No secrets in diff
- [ ] Draft PR opened — merge needs `APPROVE_MERGE`

## Test plan

1. Run `npx promptfoo eval -c evals/promptfoo.yaml --no-cache`
2. Confirm Results include FAIL for `bad-lead-missing-checklist.md`
3. Confirm PASS for `skills/market-research/SKILL.md` checklist assertions
4. Spot-check skill: lead hand-off forbidden without checklist
