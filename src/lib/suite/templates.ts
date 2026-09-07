import type { AgentSpec } from "./types";
import {
  inventPersonality,
  listTakenArchetypes,
  personalityForBuiltin,
} from "./personality";

const FIRST_NAMES = [
  "Nova",
  "Kai",
  "Remy",
  "Sable",
  "Iori",
  "Vesper",
  "Quill",
  "Mira",
  "Juno",
  "Onyx",
  "Pike",
  "Lumen",
  "Ash",
  "Nyx",
  "Reed",
  "Sol",
  "Tess",
  "Wren",
  "Zed",
  "Cleo",
];

function withBuiltinPersonality(
  spec: Omit<AgentSpec, "personality">,
): AgentSpec {
  const personality = personalityForBuiltin(spec.name);
  return {
    ...spec,
    personality,
    systemPrompt: `${spec.systemPrompt} Personality — ${personality.archetype}. Voice: ${personality.voice} Style: ${personality.speechStyle} Quirk: ${personality.quirk}`,
  };
}

export const BUILTIN_SPECS: AgentSpec[] = [
  withBuiltinPersonality({
    type: "orchestrator",
    name: "Nova",
    jobProfile: "Chief Orchestrator",
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
      "When creating agents, give each a unique name, job profile, and personality.",
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
      "You are Nova, Chief Orchestrator. Use the nova-orchestrate skill and Anthropic orchestrator-workers pattern: keep plans simple, show your routing decisions, load worker skills only when triggered, and prefer existing agents over spawning. When you hatch a new specialist, invent a distinct character (archetype, voice, quirk) — never clone an existing personality.",
    maxConcurrency: 1,
  }),
  withBuiltinPersonality({
    type: "researcher",
    name: "Kai",
    jobProfile: "Research Analyst",
    description:
      "Breaks down objectives, gathers context, and drafts investigation plans.",
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
      "You are Kai, Research Analyst. When triggered, follow the research skill: structure problems, mark unknowns, and hand off actionable next steps.",
    maxConcurrency: 2,
  }),
  withBuiltinPersonality({
    type: "builder",
    name: "Remy",
    jobProfile: "Implementation Engineer",
    description:
      "Implements concrete work products: plans, checklists, code sketches, docs.",
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
      "You are Remy, Implementation Engineer. When triggered, follow the implement skill: ship the smallest complete slice and leave a clean handoff.",
    maxConcurrency: 2,
  }),
  withBuiltinPersonality({
    type: "reviewer",
    name: "Sable",
    jobProfile: "Quality Reviewer",
    description:
      "Checks outputs against rules, guardrails, and objective success criteria.",
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
      "You are Sable, Quality Reviewer. When triggered, follow the review skill (evaluator-optimizer): validate against criteria and request rework instead of rubber-stamping.",
    maxConcurrency: 2,
  }),
  withBuiltinPersonality({
    type: "learner",
    name: "Iori",
    jobProfile: "Learning Strategist",
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
      "You are Iori, Learning Strategist. When triggered, follow the learn skill: consolidate memories into short playbook updates.",
    maxConcurrency: 1,
  }),
];

const JOB_TITLES_BY_CAP: Record<string, string> = {
  security: "Security Specialist",
  docs: "Documentation Lead",
  design: "Product Designer",
  deploy: "Release Engineer",
  monitor: "Observability Lead",
  data: "Data Specialist",
  ops: "Operations Specialist",
  testing: "Test Engineer",
  support: "Support Specialist",
};

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

export function allocateUniqueName(taken: Set<string>, seed: string): string {
  for (const name of FIRST_NAMES) {
    if (!taken.has(name.toLowerCase())) return name;
  }
  let i = 2;
  const base = seed
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  while (taken.has(`${base}${i}`.toLowerCase())) i += 1;
  return `${base}${i}`;
}

export function inventSpecForCapability(
  capability: string,
  takenNames: Set<string> = new Set(),
  takenArchetypes: Set<string> = new Set(),
): AgentSpec {
  const type = capabilityToPreferredType(capability);
  const existing = BUILTIN_SPECS.find((s) => s.type === type);
  if (existing) return existing;

  const title =
    JOB_TITLES_BY_CAP[capability] ??
    `${capability
      .split(/[_-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")} Specialist`;

  const name = allocateUniqueName(takenNames, capability);
  const personality = inventPersonality(name, capability, takenArchetypes);

  return {
    type,
    name,
    jobProfile: title,
    description: `Auto-spawned specialist for capability: ${capability}`,
    capabilities: [capability, "general"],
    rules: [
      `Specialize in ${capability} tasks.`,
      "Respect suite-wide handoff protocol.",
      "Persist lessons after each completed task.",
      "Stay online and wait for the next assignment.",
      `Stay in character as a ${personality.archetype}.`,
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
    personality,
    systemPrompt: `You are ${name}, ${title} — a ${personality.archetype}. Voice: ${personality.voice} Style: ${personality.speechStyle} Quirk: ${personality.quirk}. Follow your rules, honor guardrails, learn from outcomes, and leave clean handoff context.`,
    maxConcurrency: 1,
  };
}

export { listTakenArchetypes };
