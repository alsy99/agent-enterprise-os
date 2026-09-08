---
name: sales-outbound
description: >
  First-touch email after research pack. Use when a new lead is qualified and
  the research pack includes the Unknown checklist. Draft only — never send
  without human approval.
metadata:
  model_actor: worker
  model_verifier: planner
---

# When to use

- Lead is qualified (see `sops/sales-qualify.md`)
- Research pack path exists from `market-research`
- Research pack contains `## Unknown checklist` **and** all five rows (Headcount / team size, Shipping status of cited features, Decision-maker path, Timeline ≤90 days, Willingness to talk / design-partner interest)

# Models

- **Actor:** `worker` (Gemini Flash-Lite)
- **Verifier:** `planner` (Gemini Flash, different prompt — reject overclaims)
  - If actor was also Gemini and you need family diversity, use `verifier` (Groq gpt-oss)
- Resolve: `./scripts/resolve-model.sh sales-outbound` / `... verifier`

# Steps

1. Confirm qualification via `sops/sales-qualify.md`.
2. Read the research pack / wiki page. **Stop if `## Unknown checklist` or any of the five rows is missing** — run `market-research` first; do not draft.
3. Write 3 evidence bullets (why them, why now, why us) — no invented proof.
4. Draft email (subject + body ≤150 words) into `artifacts/outreach-drafts/<slug>.md`.
5. Set `send_status: awaiting_approval` in that file.
6. Run verifier: reject overclaims; fail if status is not `awaiting_approval`.
7. Stop. Wait for human `APPROVE_SEND`.

# Tools allowed

- Wiki / SOP read
- Write under `artifacts/outreach-drafts/`
- No email send, no calendar book

# Definition of done

- Research pack has full Unknown checklist (five rows) before drafting
- Draft file exists with subject, body, evidence, `send_status: awaiting_approval`
- Evidence cites research pack paths
- No fake logos, metrics, or case studies
- Verifier pass

# Never do

- Draft when the lead page lacks `## Unknown checklist` or any of the five rows
- Send email or InMail
- Invent social proof
- Quote pricing not in `wiki/sales/pricing.md`
- Unsourced comparative claims (“ahead of most”, “best”, category leadership) — mark `Unknown` or cite a dated source
- Language that implies the message was already sent (“I sent”, “already sent”, `send_status: sent`)

# Escalation

- Pricing/legal questions → human
- Missing research pack → run `market-research` first
- Missing `## Unknown checklist` or incomplete five rows → run `market-research` first; do not draft
