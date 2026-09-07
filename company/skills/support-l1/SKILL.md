---
name: support-l1
description: >
  Triage a customer question with wiki/SOP answers and draft a reply. Use for
  L1 tickets. Draft only — never send without approval; never invent policy.
---

# When to use

- Incoming support ticket / email / chat
- Need a grounded draft reply or escalation packet

# Steps

1. Classify: question / bug / billing / abuse.
2. Search `wiki/` and `sops/support-*.md`.
3. If known answer: draft reply into `artifacts/` with `send_status: awaiting_approval`.
4. If bug: write repro (env, steps, expected, actual) for eng.
5. If billing/legal: escalate to human; do not invent refunds.

# Tools allowed

- Wiki / SOP read
- Draft write under `artifacts/`
- No send

# Definition of done

- Classification + draft or escalation packet
- Policy claims cite an SOP path

# Never do

- Invent refunds or legal commitments
- Paste secrets or raw PII into wiki

# Escalation

- Angry enterprise / legal threat → human immediately
