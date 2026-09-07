# n=5 intervention summary

Date: 2026-09-07  
Loop: market-research → sales-outbound (draft only) × 5  
Promptfoo: `traces/runs/2026-09-07-leads-3-5-promptfoo.txt` → **6 PASS / 2 FAIL** (bad fixtures still fail)

## Minutes of human/agent operator time

| # | Slug | Type | Minutes (approx) | New lie types |
|---|---|---|---|---|
| 1 | clay | Stress / anti-ICP scale | ~35 | unsourced “ahead of most” |
| 2 | devtool-gtm | Peer (skills pack founder) | ~25 | none (notes poisoned promptfoo once) |
| 3 | indebtio | Buyer (solo Claude Code) | ~8* | none |
| 4 | openstatus | Buyer (lean MCP/Cursor) | ~8* | none |
| 5 | appear | Buyer (agentic IDE/MCP product) | ~9* | soft “exactly…” wording caught pre-finalize |

\*Leads 3–5 batched after template existed; wall ~25 min for three ≈ **~8 min/lead**.

**Mean across n=5:** ~(35+25+8+8+9)/5 ≈ **17 min/lead**.  
**Trend:** first two expensive; last three under ~15 with no new lie classes.

## Verdict (eng-pr gate)

Per bar: if still ~30+ → skill incomplete. Observed trend **under ~15 on #3–5** with no new lie types → **eng-pr on a real repo ticket is now allowed** (e.g. tighter research template / Unknown checklist). Not opening eng-pr as a department. Optional CI for promptfoo still deferred.
