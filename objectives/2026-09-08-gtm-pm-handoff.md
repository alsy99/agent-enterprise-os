# Objective: Prove PM handoff rejects incomplete leads before sales draft

- id: 2026-09-08-gtm-pm-handoff
- sponsor: ceo
- owner: pm
- function: gtm
- status: queued
- blast_radius: hard_to_undo

## Goal

Run one supervised GTM path under PM: research (with Unknown checklist) → PM check → sales draft → `awaiting_approval`. No send. Exit test: a deliberately incomplete lead is rejected by PM/sales without the human noticing first.

## Graph

1. market-research → `wiki/sales/leads/<slug>.md` (full Unknown checklist)
2. pm.check → Unknown checklist complete (`sops/handoff-reject.md`)
3. sales-outbound → `artifacts/outreach-drafts/<slug>.md`
4. critic (promptfoo echo gates)
5. ceo.APPROVE_SEND (interrupt) — **do not execute in this objective unless CEO grants**

## Blockers

- none

## Artifacts

- research: (pending — pick lead #6 or use incomplete fixture for reject demo)
- draft: (pending)
- trace: (pending)

## Approvals

- APPROVE_SEND: pending
- APPROVE_MERGE: n/a

## Budget

- max worker turns: 12
- max critic retries: 2
- models: planner / worker / verifier per integrations/models/router.yaml

## Notes

- Leads 1–5 may lack the checklist table; sales-outbound must refuse until `market-research` fills it.
- Do not batch three more leads in one session.
