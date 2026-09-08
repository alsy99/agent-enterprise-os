# Company OS — Vision and Implementation Charter

**Repo:** [alsy99/agent-enterprise-os](https://github.com/alsy99/agent-enterprise-os)  
**Status:** living charter (not a product SKU)  
**Updated:** 2026-09-08  
**Owner:** CEO (human) — Adnan Shahid  
**Audience:** humans and agents that load this repo

This file is the source of truth for *what we are building* and *how agents are allowed to work*.  
If a skill, dashboard, or orchestrator conflicts with this charter, the charter wins.

---

## 1. Vision

Build an **agent enterprise**: a company whose operating system is a hierarchy of specialized agents.

```text
CEO
 └── CXOs (CTO, COO, CFO, CCO / GTM, …)
      └── Project Managers
           └── Workers
                engineers, QA, designers, researchers,
                analysts, sales, ops, support, …
```

- **CEO** overlooks every execution path that can leave the building (send, merge, spend, public post, production deploy).
- **CXOs** architect, decide policy, and manage the worker skills in their function. They do not personally type every artifact.
- **Project managers** own objectives: dependencies, handoffs, blockers, definition of done, and whether a worker is allowed to start.
- **Workers** execute bounded skills and write artifacts. They never approve their own blast-radius actions.

This is **not** a Slack room of personas. It is a **control plane**:

- authority is hierarchical (who may decide),
- execution is supervised (who may run next),
- work is pipelined as files (what was produced),
- quality is criticized by a different model or eval,
- irreversible acts stop at a human.

The long-term target remains high automation of *tasks*. It is **not** a claim of 95% unattended company-wide work at 99.99% accuracy. Report only measured unattended success rate per loop.

---

## 2. Product we are actually building

**Company OS** — a file-based operator harness:

```text
AGENTS.md + org/* + skills/*/SKILL.md + wiki/ + sops/
  + objectives/ + evals/ + traces/ + artifacts/
```

Agents compound corrections into skills, SOPs, and evals.  
External actions stay `awaiting_approval` until a human types `APPROVE_*`.

| This is | This is not |
|---|---|
| An operating system for a company of agents | A multi-agent chat demo |
| Roles with decision rights and artifacts | Job-title personalities |
| One objective graph at a time | Eight empty CXO agents |
| Handoffs through files + PM | Peer swarm of executives |
| Measured loops | “Autonomous C-suite by Friday” |

Dogfood first. No public price until `wiki/sales/pricing.md` says otherwise.

---

## 3. Principles

1. **Files are the company.** If it is not in git (or a declared private sidecar), it did not happen.
2. **One objective is the unit of work.** Agents do not freelance.
3. **PM is the only default orchestrator.** Workers do not call workers. CXOs do not chat each other into existence.
4. **Handoffs are schemas, not vibes.** Missing checklist / tests / `send_status` = refuse and bounce back.
5. **Critic ≠ actor.** Verifier uses a different model family or a deterministic eval.
6. **Blast radius decides autonomy.** Drafts can be automatic. Sends, merges, spends cannot.
7. **Max iterations live in code or scripts, not in a prompt.**
8. **Empty seats are forbidden.** No CXO skill until that function has a worker + an eval + a real artifact type.
9. **Corrections promote.** `WRONG / SHOULD / SOP_GAP / PROMOTE / EVAL` or it did not teach the company.
10. **Honesty over theater.** Unknown is a valid value. Invented TAM, quotes, and “ahead of most” are defects.

---

## 4. Decision rights

| Seat | May | May not |
|---|---|---|
| **CEO (human + thin skill)** | Set charter and quarter objectives. `APPROVE_SEND`, `APPROVE_MERGE`, `APPROVE_SPEND`, `APPROVE_DEPLOY`, kill an objective. | Write worker artifacts as the happy path. Rubber-stamp unread diffs. |
| **CTO** | Engineering standards, stack, eng/QA definition of done, reject PRs that violate `wiki/engineering/`. | Merge `main`. Production deploy. Invent product roadmap. |
| **COO** | Which loops are “in production,” SLAs, incident/process policy. | Send external mail. Change pricing. |
| **CFO** | Human-only until money movement exists. Flag spend anomalies. | Move money. Commit to prices. |
| **CCO / GTM** | ICP, qualification bar, messaging rules, reject unsourced claims. | Send outreach. Quote prices not on `wiki/sales/pricing.md`. |
| **PM** | Open/close graph nodes, start a worker skill, reject incomplete handoffs, escalate blockers. | Approve blast-radius actions. Do the specialist work. |
| **Worker** | Read charter + relevant wiki/SOP/skill. Write under `artifacts/`, `wiki/` (scoped), `traces/`. | Edit `org/CHARTER.md` / this vision. Approve self. Skip PM. |

If a title is not in this table, it has no rights.

---

## 5. Orchestration patterns we use

Implementation language is patterns, not frameworks.

| Pattern | Role here | When |
|---|---|---|
| **Blackboard** | `wiki/` + `objectives/*.md` | Shared truth humans and agents can read |
| **Plan-and-execute** | PM writes the graph once; workers walk nodes | Default for every objective |
| **Supervisor** | PM | Dynamic “what runs next” |
| **Sequential pipeline** | research → sales.draft → CEO approve | Stable GTM loop |
| **Generator–critic** | Worker then QA/eval/Groq | Any external or merge-bound artifact |
| **HITL interrupt** | `APPROVE_*` nodes | Irreversible acts |
| **Parallel fan-out** | Multi-account research, QA + review on one PR | Only independent subtasks |
| **Hierarchical supervisors** | CEO → CXO team subgraphs | Only after 6+ active workers |
| **Swarm** | Not used for the company OS | Optional later for parallel research only, max hops enforced |

**Forbidden as the company topology:** peer handoff among CXOs, “any agent may call any agent,” persona group-chat.

Empirical default in production: orchestrator–worker beats decentralized swarms on reliability and debug cost. We follow that.

```text
CEO (HITL)
  └── PM supervisor
        ├── sequential: research → sales
        ├── critic: promptfoo + (later) Groq
        ├── later parallel: N lead packs
        └── later hierarchy: CTO subgraph (eng + qa)
```

---

## 6. Target repository layout

Existing Company OS stays. Org and objectives are added; they do not replace skills.

```text
VISION.md                          # this file (copy to repo root or org/VISION.md)
AGENTS.md                          # runtime never-do / always-do (short)
CLAUDE.md                          # must stay byte-equivalent to AGENTS.md or generated
org/
  CHARTER.md                       # quarter scope — what we may work on
  ceo/SKILL.md
  cto/SKILL.md                     # add when eng+qa both run
  coo/SKILL.md                     # add when a second production loop exists
  cco/SKILL.md                     # GTM policy
  cfo/SKILL.md                     # stub: human only
  pm/SKILL.md                      # orchestrator — first new skill
objectives/
  _TEMPLATE.md
  YYYY-MM-DD-<slug>.md             # living tickets
skills/
  market-research/SKILL.md
  sales-outbound/SKILL.md
  eng-pr/SKILL.md
  support-l1/SKILL.md
  qa/SKILL.md                      # add with first real eng ticket
  design/SKILL.md                  # later
  ops/SKILL.md                     # later
wiki/
  market/ icp.md competitors.md
  sales/ pricing.md qualification.md leads/
  engineering/ conventions.md
sops/
  correction-to-skill.md
  external-send-approval.md
  sales-qualify.md
  handoff-reject.md                # PM bounce-back rules
evals/
  promptfoo.yaml
  fixtures/
  00N-*.yaml
artifacts/
  outreach-drafts/
  pr-drafts/
traces/
  runs/
  corrections/
scripts/
  record-correction.sh
  resolve-model.sh
integrations/models/
```

Do not resurrect the deleted Next.js “Nova / Agent Suite” as the OS. A UI may later *view* objectives; it must not *be* the company.

---

## 7. Objective protocol

An objective is a markdown state machine. The PM owns it. Workers only fill nodes.

### 7.1 Template

```markdown
# Objective: <one sentence>

- id: YYYY-MM-DD-<slug>
- sponsor: ceo
- owner: pm
- function: gtm | eng | ops | mixed
- status: queued | running | blocked | awaiting_approval | done | killed
- blast_radius: reversible | correctable | hard_to_undo | irreversible

## Goal
<what done means in one paragraph>

## Graph
1. market-research → wiki/sales/leads/<slug>.md
2. pm.check → Unknown checklist complete
3. sales-outbound → artifacts/outreach-drafts/<slug>.md
4. critic (promptfoo [+ groq])
5. ceo.APPROVE_SEND (interrupt)

## Blockers
- none | <node>: <reason> → bounce to <skill>

## Artifacts
- research:
- draft:
- trace:

## Approvals
- APPROVE_SEND: pending | granted <date> by <human>
- APPROVE_MERGE: n/a

## Budget
- max worker turns: 12
- max critic retries: 2
- models: planner / worker / verifier per integrations/models/router.yaml
```

### 7.2 Status rules

| Status | Meaning |
|---|---|
| `queued` | CEO or PM created it; no worker started |
| `running` | A worker node is in progress |
| `blocked` | Handoff failed schema; PM must reopen an earlier node |
| `awaiting_approval` | Artifact ready; human required |
| `done` | Approval logged or reversible work accepted |
| `killed` | CEO stopped it |

Workers must not set `done` on blast-radius nodes.

### 7.3 Handoff contract

PM starts `sales-outbound` only if the lead page contains:

```markdown
## Unknown checklist

| Field | Value |
|---|---|
| Headcount / team size (ICP 1–5?) | sourced fact or Unknown |
| Shipping status of cited features (GA / beta / coming soon) | sourced fact or Unknown |
| Decision-maker path | sourced fact or Unknown |
| Timeline ≤90 days | sourced fact or Unknown |
| Willingness to talk / design-partner interest | Unknown |
```

Missing section or missing row → `blocked`, bounce to `market-research`.  
Same idea later: eng-pr cannot mark ready without QA eval; deploy cannot start without `APPROVE_DEPLOY`.

---

## 8. Role specifications

Every role is a `SKILL.md`. Load on demand. Do not dump all roles into one prompt.

### 8.1 CEO — `org/ceo/SKILL.md`

**When:** new quarter, new objective, any `awaiting_approval`, incident, kill decision.

**Does:**
- Write/update `org/CHARTER.md` (human edits; agent may draft).
- Accept or reject PM-escalated items.
- Record `APPROVE_*` on the objective file.

**Never:** send email, merge main, invent ICP, run workers “to be helpful.”

**Done:** decision logged on the objective.

### 8.2 PM — `org/pm/SKILL.md` (build first)

**When:** any objective not `done`/`killed`.

**Does:**
1. Read `VISION.md`, `org/CHARTER.md`, the objective.
2. Pick the single next legal node.
3. Invoke exactly one worker skill (or critic).
4. Validate handoff schema.
5. On fail: set `blocked`, name the bounce target, stop.
6. On blast-radius artifact: set `awaiting_approval`, stop for CEO.
7. Append a run line to `traces/runs/`.

**Never:** produce the sales draft or the research pack itself; approve send/merge; open a second objective without CEO.

**Max steps:** 12 per objective before forced escalate.

### 8.3 CCO / GTM — `org/cco/SKILL.md`

**When:** GTM policy change, or critic of a draft against ICP/pricing.

**Does:** reject overclaims, unsourced comparatives, prices not on the pricing page.

**Never:** send.

### 8.4 CTO — `org/cto/SKILL.md` (only after eng+qa)

**When:** eng-pr ready for review.

**Does:** check `wiki/engineering/conventions.md`, tests, scope.

**Never:** `APPROVE_MERGE` (CEO/human).

### 8.5 COO — `org/coo/SKILL.md` (later)

**When:** weekly ops review of traces (intervention minutes, lie types, loops in production).

### 8.6 CFO — `org/cfo/SKILL.md`

Stub. All spend is human. Skill may only say “escalate to CEO.”

### 8.7 Workers (existing + planned)

| Skill | Artifact | Critic | Approval |
|---|---|---|---|
| `market-research` | `wiki/sales/leads/<slug>.md` | checklist + sourced-or-Unknown | none |
| `sales-outbound` | `artifacts/outreach-drafts/<slug>.md` | promptfoo + no-send rules | `APPROVE_SEND` |
| `eng-pr` | branch + `artifacts/pr-drafts/` | promptfoo / tests | `APPROVE_MERGE` |
| `qa` (add) | eval log | — | blocks PM `done` on eng |
| `support-l1` | reply draft | tone + no-promise | `APPROVE_SEND` |
| `design` (later) | mock path | brand rules | human on public assets |
| `ops` (later) | runbook change | COO | `APPROVE_DEPLOY` |

Workers read their `SKILL.md` before acting. They write traces. They do not edit this charter.

---

## 9. Approval matrix

| Action | Example | Autonomy |
|---|---|---|
| Reversible | Wiki draft, research pack, internal notes | Worker auto |
| Correctable | CRM-like file in repo, staging branch | Worker + sample audit |
| Hard to undo | Customer email, public post, paid ads | CEO `APPROVE_SEND` |
| Irreversible | Merge main, production deploy, money | CEO + second check |

Tokens:

- `APPROVE_SEND`
- `APPROVE_MERGE`
- `APPROVE_SPEND`
- `APPROVE_DEPLOY`

Must appear on the objective file with date and human identity. Agents may not type these on their own behalf.

---

## 10. Correction → skill loop

Mandatory block (already in `AGENTS.md`):

```text
WRONG: ...
SHOULD: ...
SOP_GAP: missing | ambiguous | conflict
PROMOTE: yes | no
EVAL: input → expected
```

Pipeline:

1. Human pastes block into `./scripts/record-correction.sh` with hand-pinned `EVAL_ID`.
2. Patch the matching `SKILL.md` in the same commit.
3. Add a promptfoo fixture if the lie is detectable by string/schema.
4. If `SOP_GAP: conflict`, freeze the SOP until CEO/CXO merge.

Public repo policy (`wiki/sales/leads/README.md`): no personal emails, phones, or “sent to x@…” in git.

---

## 11. Models

Route by job (`integrations/models/`). Do not use one model for actor and critic.

| Role | Default (free-tier, 2026-09) | Use |
|---|---|---|
| Planner | Gemini 3.6 Flash | research, PM planning |
| Worker | Gemini 3.5 Flash-Lite | drafts, extracts |
| Verifier | Groq `openai/gpt-oss-120b` | second opinion |
| Coder | Mistral Codestral; NIM Nemotron Super alternate | eng-pr |
| Thinker | Z.AI GLM-4.7-Flash (1 concurrent) | rare SOP review |

Promptfoo `echo` is an **assertion linter**, not a verifier. Keep it as a merge gate. Add Groq critic as a separate node when drafts start failing only on meaning, not strings.

Never put customer PII on NIM trial, OpenRouter free hosts, or any ToS that trains on prompts if that is unacceptable.

---

## 12. Implementation phases

### Phase 0 — done (dogfood GTM loop)

- File harness at repo root; Nova suite removed.
- Skills: market-research, sales-outbound, eng-pr, support-l1.
- n=5 lead packets (Clay, DevTool GTM, Indebtio, OpenStatus, Appear).
- Promptfoo gates: no `already sent`, no `ahead of most`.
- Correction promoted into sales skill.
- PR #1: Unknown checklist on research (must also bind sales-outbound before it is a real gate).

### Phase 1 — PM supervisor (next)

Deliverables:

1. `org/pm/SKILL.md` + `org/CHARTER.md` + this `VISION.md` in repo.
2. `objectives/_TEMPLATE.md` and one live objective wrapping research → sales.
3. `sales-outbound` refuses lead pages without `## Unknown checklist`.
4. PM bounce-back documented in `sops/handoff-reject.md`.
5. Single session: PM → research → PM check → sales → `awaiting_approval`. No send.

Exit test: a deliberately incomplete lead is rejected by PM/sales without the human noticing first.

### Phase 2 — critic + one send

1. Groq critic node: `PASS | FAIL + reason` on drafts (max 2 retries).
2. One real `APPROVE_SEND` on Indebtio or OpenStatus using gitignored `*.private.md` for the address.
3. Trace reply / no-reply. That is the first closed GTM loop.

### Phase 3 — CTO subgraph (eng)

1. Use `eng-pr` on a real repo ticket (CI for promptfoo, or CLAUDE.md generation from AGENTS.md).
2. Add `skills/qa/SKILL.md` (run promptfoo, fail the PR packet if required fixtures pass).
3. Add `org/cto/SKILL.md` as critic of eng artifacts only.
4. `APPROVE_MERGE` remains human.

### Phase 4 — hierarchy only if needed

Stand up COO / extra CXOs when there are **two production loops** (e.g. GTM + eng) and a single PM objective file is overflowing.

Stand up design / ops / analyst workers only when there is an artifact you will use that week.

### Phase 5 — optional runtime

If running PM by hand is the bottleneck, encode the same graph in LangGraph (durable state + interrupt). The graph must read/write the same markdown. Framework is an adapter, not a second company.

---

## 13. Eval and observability

Minimum suite (`evals/promptfoo.yaml`):

| Case | Required result |
|---|---|
| Real drafts | PASS (`awaiting_approval`, placeholders, no `@` emails, no fake price) |
| `bad-already-sent.md` | FAIL |
| `bad-ahead-of-most.md` | FAIL |
| `bad-lead-missing-checklist.md` | FAIL |
| Skill files still contain the gates | PASS (regression only) |

After Phase 1, add:

- PM reject test: sales skill text contains “Unknown checklist” requirement.
- Objective fixture missing a node cannot be marked `done`.

Traces must record: date, objective id, harness, model ids, minutes, pass/fail, bounce-backs.

Langfuse is optional after markdown traces become painful (~10+ runs/week).

---

## 14. Anti-patterns (explicitly rejected)

- Rebuilding Nova / Beacon / a multi-tab agent suite as the source of truth.
- CEO↔CTO↔COO group chat with no artifacts.
- Swarm topology for the company OS.
- CXO skills with no workers.
- Fine-tuning instead of harness + evals.
- Vector memory before 30 corrected traces.
- Installing thousands of community skills.
- Claiming 95% / 99.99% company-wide automation.
- Agents typing `APPROVE_*`.
- Personal prospect data in a public repo.

---

## 15. Success metrics

Report these, nothing fancier.

| Metric | Phase 1 target | Notes |
|---|---|---|
| Loops with a PM-owned objective | 1 | research→sales |
| Unauthorized sends | 0 | hard |
| Handoff rejects caught by PM/skill (not human) | ≥1 demonstrated | incomplete checklist |
| Minutes of human time per lead | falling vs ~17 min mean | do not batch-fake this |
| New lie classes per 5 leads | 0 after promotion | else skill incomplete |
| CXO seats with no worker | 0 | |
| Unattended success rate | measured, not targeted yet | pass@k on evals |

CEO health check (weekly): open objectives, blockers older than 48h, eval fixtures that went green by accident.

---

## 16. How an agent should start a turn

```text
1. Read AGENTS.md (never-do list).
2. Read this VISION.md sections 3–5 if playing PM/CXO/CEO.
3. Read org/CHARTER.md and the active objectives/*.md.
4. If you are a worker: load only skills/<you>/SKILL.md.
5. If you are PM: load org/pm/SKILL.md only; call one worker.
6. Write artifacts + trace.
7. Stop on blocked or awaiting_approval.
```

Do not load every SKILL.md in the repo.

---

## 17. Immediate next commit (checklist)

- [x] Add this file to the repo (`VISION.md` or `org/VISION.md`) and link it from `README.md`.
- [x] Add `org/CHARTER.md` (quarter: dogfood GTM loop + PM supervisor only).
- [x] Add `org/pm/SKILL.md` and `objectives/_TEMPLATE.md`.
- [x] Close PR #1 only after `sales-outbound` requires the Unknown checklist.
- [x] Create `objectives/2026-09-08-gtm-pm-handoff.md` as the first PM-run objective.
- [x] Do not add designer/ops/CFO workers in that commit.

When those boxes are checked, the repo matches the vision in structure — not only in conversation.
