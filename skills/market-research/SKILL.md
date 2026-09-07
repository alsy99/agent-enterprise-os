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
5. Do not draft email here — hand off to `sales-outbound`.
6. Run verifier on claims (no invented TAM/quotes).

# Tools allowed

- Browser (read-only)
- Wiki read/write under `wiki/`
- No email, no CRM write

# Definition of done

- Wiki page path recorded
- 3 evidence bullets present
- Every number/claim sourced or marked `Unknown`
- Next step named: `sales-outbound`
- Verifier pass (or human escalate)

# Never do

- Invent TAM/SAM, quotes, or pricing
- Send outreach

# Escalation

- Conflicting sources → `SOP_GAP: conflict` + ask human
