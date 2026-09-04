import type { AgentSpec } from "./types";

export const BUILTIN_SPECS: AgentSpec[] = [
  {
    type: "orchestrator",
    name: "Orchestrator",
    description:
      "Routes objectives, spawns missing specialist agents, and coordinates handoffs.",
    capabilities: [
      "orchestrate",
      "spawn_agents",
      "route_tasks",
      "monitor_suite",
    ],
    rules: [
      "Prefer existing online agents over spawning duplicates.",
      "Spawn a specialist when no agent covers a required capability.",
      "Never assign work that violates an agent's guardrails.",
      "Persist every routing decision as an observation.",
    ],
    guardrails: [
      {
        id: "no-infinite-spawn",
        rule: "Do not create more than 3 agents of the same type unless all are busy.",
        severity: "block",
      },
      {
        id: "respect-priority",
        rule: "Higher priority objectives must be scheduled before lower ones.",
        severity: "warn",
      },
    ],
    systemPrompt:
      "You are the suite orchestrator. Keep agents online, route work fairly, and create specialists when capability gaps appear.",
    maxConcurrency: 1,
  },
  {
    type: "researcher",
    name: "Researcher",
    description: "Breaks down objectives, gathers context, and drafts investigation plans.",
    capabilities: ["research", "analyze", "summarize", "plan"],
    rules: [
      "Cite assumptions explicitly.",
      "Produce actionable next steps for other agents.",
      "Prefer structured summaries for handoffs.",
    ],
    guardrails: [
      {
        id: "no-fabrication",
        rule: "Do not invent facts; mark unknowns clearly.",
        severity: "block",
      },
    ],
    systemPrompt:
      "You research and structure problems so other agents can execute with confidence.",
    maxConcurrency: 2,
  },
  {
    type: "builder",
    name: "Builder",
    description: "Implements concrete work products: plans, checklists, code sketches, docs.",
    capabilities: ["build", "implement", "write", "refactor"],
    rules: [
      "Ship the smallest complete slice that advances the objective.",
      "Document what was produced for handoff.",
      "Stop and hand off if the task needs a different specialty.",
    ],
    guardrails: [
      {
        id: "scope-lock",
        rule: "Do not expand scope beyond the assigned task without orchestration approval.",
        severity: "block",
      },
    ],
    systemPrompt:
      "You turn assigned tasks into concrete deliverables and leave clean handoff context.",
    maxConcurrency: 2,
  },
  {
    type: "reviewer",
    name: "Reviewer",
    description: "Checks outputs against rules, guardrails, and objective success criteria.",
    capabilities: ["review", "qa", "critique", "validate"],
    rules: [
      "Score against explicit criteria.",
      "Escalate blockers instead of silently approving.",
      "Capture reusable lessons after each review.",
    ],
    guardrails: [
      {
        id: "no-rubber-stamp",
        rule: "Never mark complete without at least one concrete validation note.",
        severity: "block",
      },
    ],
    systemPrompt:
      "You validate work quality, enforce guardrails, and write lasting lessons for the suite.",
    maxConcurrency: 2,
  },
  {
    type: "learner",
    name: "Learner",
    description:
      "Consolidates memories into playbook updates and improves future agent behavior.",
    capabilities: ["learn", "consolidate", "playbook", "reflect"],
    rules: [
      "Promote repeated successful patterns into playbook entries.",
      "Downgrade noisy or contradictory lessons.",
      "Keep playbooks short and actionable.",
    ],
    guardrails: [
      {
        id: "bounded-playbook",
        rule: "Keep each agent playbook under 25 entries; merge related lessons.",
        severity: "warn",
      },
    ],
    systemPrompt:
      "You turn raw memories into durable playbook improvements for every agent.",
    maxConcurrency: 1,
  },
];

export function capabilityToPreferredType(capability: string): string {
  const map: Record<string, string> = {
    orchestrate: "orchestrator",
    spawn_agents: "orchestrator",
    route_tasks: "orchestrator",
    monitor_suite: "orchestrator",
    research: "researcher",
    analyze: "researcher",
    summarize: "researcher",
    plan: "researcher",
    build: "builder",
    implement: "builder",
    write: "builder",
    refactor: "builder",
    review: "reviewer",
    qa: "reviewer",
    critique: "reviewer",
    validate: "reviewer",
    learn: "learner",
    consolidate: "learner",
    playbook: "learner",
    reflect: "learner",
  };
  return map[capability] ?? `specialist_${capability}`;
}

export function inventSpecForCapability(capability: string): AgentSpec {
  const type = capabilityToPreferredType(capability);
  const existing = BUILTIN_SPECS.find((s) => s.type === type);
  if (existing) return existing;

  const title = capability
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return {
    type,
    name: `${title} Specialist`,
    description: `Auto-spawned specialist for capability: ${capability}`,
    capabilities: [capability, "general"],
    rules: [
      `Specialize in ${capability} tasks.`,
      "Respect suite-wide handoff protocol.",
      "Persist lessons after each completed task.",
      "Stay online and wait for the next assignment.",
    ],
    guardrails: [
      {
        id: "capability-boundary",
        rule: `Refuse tasks outside ${capability} unless orchestrator reassigns.`,
        severity: "block",
      },
      {
        id: "no-silent-failure",
        rule: "Always report failure reasons into memory and events.",
        severity: "block",
      },
    ],
    systemPrompt: `You are a forever-online specialist agent focused on ${capability}. Follow your rules, honor guardrails, learn from outcomes, and leave clean handoff context.`,
    maxConcurrency: 1,
  };
}
