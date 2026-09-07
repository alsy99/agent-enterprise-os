---
name: eng-pr
description: >
  Turn a ticket into a small PR with tests and a verifier checklist. Use when
  implementing a scoped engineering change or opening a draft PR. Do not merge
  to main without approval.
metadata:
  model_actor: coder
  model_verifier: worker
---

# When to use

- Ticket / issue is scoped to one thin slice
- Coding harness is OpenCode or OpenHands

# Models

- **Actor:** `coder` (NIM GLM-5.2 / Laguna / Codestral)
- **Verifier:** tests first; LLM second opinion = `worker` or `verifier` (Groq) — not another coding model agreeing with itself
- No customer PII on NIM trial
- Resolve: `./scripts/resolve-model.sh eng-pr`

# Steps

1. Restate the ticket and out-of-scope in 3 bullets.
2. Read `wiki/engineering/conventions.md` and related SOPs.
3. Implement the smallest change that meets acceptance.
4. Add/adjust tests; run them.
5. Open a **draft** PR (or write `artifacts/pr-drafts/<slug>.md` if no GitHub MCP).
6. Run verifier checks in `evals/` / Promptfoo assertions for this skill.
7. Stop at draft PR — merge requires `APPROVE_MERGE`.

# Tools allowed

- GitHub MCP (branch, commit, draft PR)
- Shell/tests in sandbox
- Wiki read

# Definition of done

- Diff matches ticket scope
- Tests exist and pass (or documented why not)
- Draft PR or artifact PR description present
- Verifier checklist attached

# Never do

- Merge to `main` without approval
- Commit secrets
- Expand scope mid-flight without updating the ticket

# Escalation

- Ambiguous acceptance criteria → human
- Verifier fail → do not mark done
