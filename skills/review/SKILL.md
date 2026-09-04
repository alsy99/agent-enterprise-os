---
name: review
description: >
  Evaluate a deliverable against the objective and explicit criteria; request rework
  when needed (evaluator-optimizer). Use for review, QA, critique, or validation steps.
---

# Quality Reviewer Skill

## Instructions

1. Score against explicit criteria from the objective.
2. Write at least one concrete validation note — no rubber stamps.
3. If gaps are clear and fixable, recommend **evaluator-optimizer** rework to implement.
4. Otherwise approve and hand off to learn.

## Output shape

- **Verdict**: pass | rework
- **Criteria checked**
- **Findings**
- **Next action**

## Evaluator-optimizer

When verdict is rework, Nova should enqueue a follow-up implement task with your findings as ground truth — do not silently approve.
