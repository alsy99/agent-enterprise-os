# Run trace — The DevTool GTM Company (n=2)

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Target | The DevTool GTM Company (`devtool-gtm`) |
| Why this target | Matches ICP: founder-led practice shipping GTM agent skills for Cursor/Claude — not a scaled GTM platform |
| Harness | Cursor agent, cwd = repo root; `skills/market-research` + `skills/sales-outbound` loaded |
| Pass/fail (loop) | **PASS** (no correction required after teacher grade) |
| Human intervention time | ~25 min (pick ICP-fit target, research, draft, grade, promptfoo, pack) |
| Unattended success | no — human operated the loop |

## Models

| Step | Role | model_id | provider |
|---|---|---|---|
| market-research actor | planner | `gemini-3.6-flash` | google |
| sales-outbound actor | worker | `gemini-3.5-flash-lite` | google |
| Assertion linter | promptfoo `echo` | n/a | local |

Resolved via `./scripts/resolve-model.sh market-research` / `sales-outbound`.

## Tool calls

1. Read ICP + leads privacy README + skills
2. WebSearch / WebFetch for ICP-fit small teams (Adaptico, GTM Co-Founder, etc.)
3. Fetch `thedevtoolgtmcompany.com` + `github.com/AIDevGTM/gtm-cofounder`
4. Write `wiki/sales/leads/devtool-gtm.md`
5. Write `artifacts/outreach-drafts/devtool-gtm.md` (placeholders only; no personal emails)
6. Teacher grade → PASS (Notes reworded so anti-pattern strings do not poison promptfoo)
7. Extend `evals/promptfoo.yaml` for new draft; run CLI

## Artifacts

- `wiki/sales/leads/devtool-gtm.md`
- `artifacts/outreach-drafts/devtool-gtm.md` (`send_status: awaiting_approval`)
- Promptfoo CLI: `traces/runs/2026-09-07-devtool-gtm-promptfoo.txt`

## Teacher grade

| Check | Result |
|---|---|
| ICP fit (1–5 / Cursor-class harness) | PASS (founder-led; Cursor/Claude skills pack) |
| Numbers sourced or Unknown | PASS (267 stars cited on lead page only; headcount Unknown beyond founder branding) |
| `awaiting_approval` | PASS |
| Placeholders only / no personal email | PASS |
| No price / no fake case study / no award claim in draft | PASS |
| No “already sent” / no “ahead of most” | PASS |
| Correction | none |

## Promptfoo

From `2026-09-07-devtool-gtm-promptfoo.txt`: **3 passed / 2 failed / 0 errors**

- clay draft PASS
- **devtool-gtm draft PASS**
- bad-already-sent FAIL (required)
- bad-ahead-of-most FAIL (required)
- Unknown string PASS

## Scope

n=2/5. Still freeze eng-pr as a department.
