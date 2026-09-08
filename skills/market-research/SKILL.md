---
name: market-research
description: >
  Build an ICP/competitor/opportunity research pack with dated sources and
  explicit unknowns. Use when researching a segment, lead company, or market
  before outbound. Trigger on market research, ICP, competitor, or research pack.
metadata:
  model_actor: planner
  model_verifier: thinker
---

# When to use

- Before first-touch outbound
- New segment or lead company needs a wiki pack

# Models

- **Actor:** `planner` (Gemini Flash — long context + browse)
- **Verifier:** `thinker` or `verifier` (GLM-4.7-Flash / Groq gpt-oss — different family)
- Resolve: `./scripts/resolve-model.sh market-research`

# Steps

1. Restate the research question in one sentence.
2. Read `wiki/market/` if pages exist; note `Updated:` dates.
3. Write or update a page under `wiki/market/` (or `wiki/sales/leads/<slug>.md` for a single lead).
4. Produce exactly:
   - ICP or account hypothesis
   - 3 evidence bullets (sourced or `Unknown`)
   - Competitors / alternatives (known vs unknown)
   - Opportunity one-liner + next skill (`sales-outbound`)
5. **If the page is a lead** (`wiki/sales/leads/<slug>.md`): complete the **Required Unknown checklist** below. Every row must appear. A row’s value is either a sourced fact or the literal word `Unknown`. Omitting a row = incomplete — do not hand off to `sales-outbound`.
6. Do not draft email here — hand off to `sales-outbound`.
7. Run verifier on claims (no invented TAM/quotes) and confirm the checklist is present for leads.

# Required Unknown checklist (lead pages)

Copy this block into every lead page (values filled):

```markdown
## Unknown checklist

| Field | Value |
|---|---|
| Headcount / team size (ICP 1–5?) | <sourced fact or Unknown> |
| Shipping status of cited features (GA / beta / coming soon) | <sourced fact or Unknown> |
| Decision-maker path | <sourced fact or Unknown> |
| Timeline ≤90 days | <sourced fact or Unknown> |
| Willingness to talk / design-partner interest | Unknown |
```

Notes:

- “Headcount” may be “appears solo (first-person site)” with a URL — still cite the source. If not evidenced, write `Unknown`.
- Do not invent headcount, ARR, or shipping status to avoid `Unknown`.
- `Willingness…` stays `Unknown` until a human confirms a reply or meeting.

# Tools allowed

- Browser (read-only)
- Wiki read/write under `wiki/`
- No email, no CRM write

# Definition of done

- Wiki page path recorded
- 3 evidence bullets present
- Every number/claim sourced or marked `Unknown`
- Lead pages include the full **Unknown checklist** (all five rows)
- Next step named: `sales-outbound`
- Verifier pass (or human escalate)

# Never do

- Invent TAM/SAM, quotes, or pricing
- Skip checklist rows on lead pages
- Hand off to `sales-outbound` with missing checklist
- Send outreach

# Escalation

- Conflicting sources → `SOP_GAP: conflict` + ask human
