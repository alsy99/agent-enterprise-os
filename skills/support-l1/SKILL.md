---
name: support-l1
description: >
  Triage a customer question with wiki/SOP answers and draft a reply. Use for
  L1 tickets. Draft only — never send without approval; never invent policy.
metadata:
  model_actor: worker
  model_verifier: planner
---

# When to use

- Incoming support ticket / email / chat
- Need a grounded draft reply or escalation packet

# Models

- **Actor:** `worker` (Flash-Lite or Groq Qwen for speed)
- **Verifier:** `planner` (Flash + SOP checker)
- Resolve: `./scripts/resolve-model.sh support-l1`

# Steps

1. Classify: question / bug / billing / abuse.
2. Search `wiki/` and `sops/support-*.md`.
3. If known answer: draft reply into `artifacts/` with `send_status: awaiting_approval`.
4. If bug: write repro (env, steps, expected, actual) for eng.
5. If billing/legal: escalate to human; do not invent refunds.
6. Verifier checks SOP citation and no invented policy.

# Tools allowed

- Wiki / SOP read
- Draft write under `artifacts/`
- No send

# Definition of done

- Classification + draft or escalation packet
- Policy claims cite an SOP path
- Verifier pass

# Never do

- Invent refunds or legal commitments
- Paste secrets or raw PII into wiki

# Escalation

- Angry enterprise / legal threat → human immediately
