import {
  bumpAgentStats,
  createAgent,
  createHandoff,
  createObjective,
  createTask,
  emitEvent,
  heartbeatAllOnline,
  listAgents,
  listMemories,
  listObjectives,
  listTasks,
  updateAgentIdentity,
  updateAgentPlaybook,
  updateAgentStatus,
  updateObjectiveStatus,
  updateTask,
  acceptHandoff,
  addMemory,
} from "./store";
import {
  allocateUniqueName,
  BUILTIN_SPECS,
  inventSpecForCapability,
} from "./templates";
import type { AgentRecord, Objective, Task } from "./types";

function agentCovers(agent: AgentRecord, capability: string) {
  return agent.capabilities.includes(capability);
}

function findAvailableAgent(capability: string): AgentRecord | null {
  const agents = listAgents().filter(
    (a) =>
      agentCovers(a, capability) &&
      (a.status === "online" || a.status === "waiting"),
  );
  if (agents.length === 0) return null;
  return agents.sort(
    (a, b) =>
      a.stats.completed +
      a.stats.failed -
      (b.stats.completed + b.stats.failed),
  )[0];
}

function countAgentsOfType(type: string) {
  return listAgents().filter((a) => a.type === type).length;
}

function takenNames(extra?: string[]): Set<string> {
  const set = new Set(
    listAgents().map((a) => a.name.toLowerCase()),
  );
  for (const n of extra ?? []) set.add(n.toLowerCase());
  return set;
}

export function ensureBuiltinAgents() {
  const existing = listAgents();
  for (const spec of BUILTIN_SPECS) {
    const match = existing.find((a) => a.type === spec.type);
    if (!match) {
      createAgent({
        type: spec.type,
        name: spec.name,
        jobProfile: spec.jobProfile,
        rules: spec.rules,
        guardrails: spec.guardrails,
        capabilities: spec.capabilities,
        systemPrompt: spec.systemPrompt,
        status: "online",
      });
      continue;
    }

    if (
      match.name !== spec.name ||
      match.jobProfile !== spec.jobProfile ||
      !match.jobProfile
    ) {
      updateAgentIdentity(match.id, {
        name: spec.name,
        jobProfile: spec.jobProfile,
        systemPrompt: spec.systemPrompt,
      });
    }
  }

  // Rename legacy generic specialists to unique names + job profiles
  for (const agent of listAgents()) {
    if (!agent.type.startsWith("specialist_")) continue;
    const capability = agent.type.replace("specialist_", "");
    const looksGeneric =
      agent.name.toLowerCase().includes("specialist") ||
      !agent.jobProfile ||
      agent.name === agent.jobProfile;
    if (!looksGeneric) continue;

    const name = allocateUniqueName(takenNames([agent.name]), capability);
    const title =
      inventSpecForCapability(capability, takenNames()).jobProfile;
    updateAgentIdentity(agent.id, {
      name,
      jobProfile: title,
      systemPrompt: `You are ${name}, ${title}. Follow your rules, honor guardrails, learn from outcomes, and leave clean handoff context.`,
    });
  }
}

export function spawnAgentForCapability(capability: string): AgentRecord {
  const taken = takenNames();
  const spec = inventSpecForCapability(capability, taken);
  const sameType = countAgentsOfType(spec.type);
  const busySame = listAgents().filter(
    (a) => a.type === spec.type && a.status === "busy",
  ).length;

  if (sameType >= 3 && busySame < sameType) {
    const waiting = listAgents().find(
      (a) =>
        a.type === spec.type &&
        (a.status === "online" || a.status === "waiting"),
    );
    if (waiting) {
      emitEvent(
        "warn",
        "orchestrator",
        `Spawn blocked by guardrail; reusing ${waiting.name}`,
        { capability },
      );
      return waiting;
    }
  }

  const name =
    sameType === 0
      ? spec.name
      : allocateUniqueName(taken, `${capability}${sameType + 1}`);

  const agent = createAgent({
    type: spec.type,
    name,
    jobProfile: spec.jobProfile,
    rules: spec.rules,
    guardrails: spec.guardrails,
    capabilities: spec.capabilities,
    systemPrompt: spec.systemPrompt.replace(spec.name, name),
    status: "online",
  });

  emitEvent(
    "success",
    "orchestrator",
    `Spawned ${agent.name} (${agent.jobProfile}) for "${capability}"`,
    { agentId: agent.id, capability },
  );

  return agent;
}

export function ensureAgentForCapability(capability: string): AgentRecord {
  const available = findAvailableAgent(capability);
  if (available) return available;

  const anyCapable = listAgents().find((a) => agentCovers(a, capability));
  if (anyCapable && anyCapable.status === "busy") {
    // Create another instance so work can proceed
    return spawnAgentForCapability(capability);
  }

  return spawnAgentForCapability(capability);
}

export function decomposeObjective(objective: Objective): Task[] {
  const existing = listTasks(objective.id);
  if (existing.length > 0) return existing;

  const plan = [
    {
      title: `Research: ${objective.title}`,
      description: `Investigate and structure the objective: ${objective.description}`,
      requiredCapability: "research",
    },
    {
      title: `Build: ${objective.title}`,
      description: `Produce the first concrete deliverable for: ${objective.description}`,
      requiredCapability: "build",
    },
    {
      title: `Review: ${objective.title}`,
      description: `Validate the deliverable against success criteria for: ${objective.description}`,
      requiredCapability: "review",
    },
    {
      title: `Learn from: ${objective.title}`,
      description: `Consolidate lessons and update playbooks after: ${objective.description}`,
      requiredCapability: "learn",
    },
  ];

  // Detect custom capability hints in the description, e.g. [cap:security]
  const hint = objective.description.match(/\[cap:([a-z0-9_-]+)\]/i);
  if (hint) {
    const capability = hint[1].toLowerCase();
    plan.splice(1, 0, {
      title: `Specialist (${capability}): ${objective.title}`,
      description: `Handle specialized ${capability} work for: ${objective.description}`,
      requiredCapability: capability,
    });
  }

  return plan.map((p) =>
    createTask({
      objectiveId: objective.id,
      title: p.title,
      description: p.description,
      requiredCapability: p.requiredCapability,
    }),
  );
}

function checkGuardrails(agent: AgentRecord, task: Task): string | null {
  for (const g of agent.guardrails) {
    if (
      g.id === "capability-boundary" &&
      !agent.capabilities.includes(task.requiredCapability) &&
      !agent.capabilities.includes("general")
    ) {
      if (g.severity === "block") {
        return g.rule;
      }
    }
    if (g.id === "scope-lock" && task.description.toLowerCase().includes("expand scope")) {
      if (g.severity === "block") return g.rule;
    }
  }
  return null;
}

function buildWorkProduct(agent: AgentRecord, task: Task, objective: Objective) {
  const memories = listMemories(agent.id, 5)
    .map((m) => `- (${m.kind}) ${m.content}`)
    .join("\n");
  const playbook = agent.playbook.slice(0, 5).map((p) => `- ${p}`).join("\n");

  return [
    `## ${task.title}`,
    ``,
    `Agent: ${agent.name} (${agent.type})`,
    `Capability: ${task.requiredCapability}`,
    `Objective: ${objective.title}`,
    ``,
    `### Actions`,
    `1. Applied rules: ${agent.rules.slice(0, 2).join("; ")}`,
    `2. Consulted ${listMemories(agent.id, 5).length} prior memories`,
    `3. Produced a durable artifact for the next agent`,
    ``,
    `### Deliverable`,
    agent.type === "researcher"
      ? `Structured brief for "${objective.title}": goals clarified, unknowns listed, recommended build steps prepared.`
      : agent.type === "builder"
        ? `Built first slice for "${objective.title}": checklist + implementation notes ready for review.`
        : agent.type === "reviewer"
          ? `Review passed with notes. Criteria checked against objective description. Ready for learning consolidation.`
          : agent.type === "learner"
            ? `Lessons consolidated into playbooks for participating agents.`
            : `Specialist output for ${task.requiredCapability} on "${objective.title}".`,
    ``,
    playbook ? `### Active playbook\n${playbook}` : "",
    memories ? `### Recalled context\n${memories}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function learnFromTask(agent: AgentRecord, task: Task, success: boolean) {
  const lesson = success
    ? `Succeeded on ${task.requiredCapability}: keep concise handoffs and cite objective constraints early.`
    : `Failed on ${task.requiredCapability}: capture blockers immediately and request reassignment.`;

  addMemory({
    agentId: agent.id,
    kind: "lesson",
    content: lesson,
    tags: [task.requiredCapability, success ? "success" : "failure"],
    relatedTaskId: task.id,
    relatedObjectiveId: task.objectiveId,
    importance: success ? 0.7 : 0.9,
  });
  bumpAgentStats(agent.id, "lessons");

  const playbook = [...agent.playbook];
  if (!playbook.includes(lesson)) {
    playbook.unshift(lesson);
    updateAgentPlaybook(agent.id, playbook.slice(0, 25));
  }

  // Learner also improves peer playbooks on learn tasks
  if (task.requiredCapability === "learn") {
    const peers = listAgents().filter((a) => a.id !== agent.id);
    for (const peer of peers) {
      const peerLesson = `From suite reflection: prioritize clear handoffs for ${peer.type} work.`;
      const next = [peerLesson, ...peer.playbook.filter((p) => p !== peerLesson)].slice(
        0,
        25,
      );
      updateAgentPlaybook(peer.id, next);
      addMemory({
        agentId: peer.id,
        kind: "lesson",
        content: peerLesson,
        tags: ["suite-learning", peer.type],
        relatedTaskId: task.id,
        relatedObjectiveId: task.objectiveId,
        importance: 0.6,
      });
      bumpAgentStats(peer.id, "lessons");
    }
  }
}

export function executeTask(task: Task): void {
  const objective = listObjectives().find((o) => o.id === task.objectiveId);
  if (!objective || objective.status !== "active") return;

  const agent = ensureAgentForCapability(task.requiredCapability);
  const blocked = checkGuardrails(agent, task);
  if (blocked) {
    updateTask(task.id, {
      status: "blocked",
      error: blocked,
      assignedAgentId: agent.id,
    });
    emitEvent("error", agent.name, `Guardrail blocked task: ${blocked}`, {
      taskId: task.id,
    });
    return;
  }

  updateAgentStatus(agent.id, "busy");
  updateTask(task.id, {
    status: "running",
    assignedAgentId: agent.id,
    startedAt: new Date().toISOString(),
  });

  addMemory({
    agentId: agent.id,
    kind: "observation",
    content: `Started task "${task.title}" for objective "${objective.title}"`,
    tags: ["start", task.requiredCapability],
    relatedTaskId: task.id,
    relatedObjectiveId: objective.id,
    importance: 0.4,
  });

  try {
    const product = buildWorkProduct(agent, task, objective);
    updateTask(task.id, {
      status: "completed",
      result: product,
      completedAt: new Date().toISOString(),
      error: null,
    });
    bumpAgentStats(agent.id, "completed");
    learnFromTask(agent, task, true);

    addMemory({
      agentId: agent.id,
      kind: "context",
      content: product.slice(0, 1200),
      tags: ["deliverable", task.requiredCapability],
      relatedTaskId: task.id,
      relatedObjectiveId: objective.id,
      importance: 0.8,
    });

    // Handoff to next queued task's future agent
    const remaining = listTasks(objective.id).filter(
      (t) => t.status === "queued" || t.id === task.id,
    );
    const next = listTasks(objective.id).find((t) => t.status === "queued");
    if (next) {
      const nextAgent = ensureAgentForCapability(next.requiredCapability);
      const handoff = createHandoff({
        fromAgentId: agent.id,
        toAgentId: nextAgent.id,
        taskId: next.id,
        objectiveId: objective.id,
        summary: `${agent.name} → ${nextAgent.name}: ${task.title} complete; start "${next.title}"`,
        context: {
          priorTaskId: task.id,
          priorResultPreview: product.slice(0, 500),
          objectiveTitle: objective.title,
          playbookHints: agent.playbook.slice(0, 3),
        },
      });
      acceptHandoff(handoff.id);
      addMemory({
        agentId: agent.id,
        kind: "handoff_out",
        content: handoff.summary,
        tags: ["handoff"],
        relatedTaskId: task.id,
        relatedObjectiveId: objective.id,
        importance: 0.75,
      });
      addMemory({
        agentId: nextAgent.id,
        kind: "handoff_in",
        content: `${handoff.summary}\n\nContext: ${JSON.stringify(handoff.context)}`,
        tags: ["handoff"],
        relatedTaskId: next.id,
        relatedObjectiveId: objective.id,
        importance: 0.85,
      });
      updateAgentStatus(nextAgent.id, "waiting");
    }

    emitEvent("success", agent.name, `Completed: ${task.title}`, {
      taskId: task.id,
      remaining: remaining.length - 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    updateTask(task.id, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    });
    bumpAgentStats(agent.id, "failed");
    learnFromTask(agent, task, false);
    emitEvent("error", agent.name, `Failed: ${task.title} — ${message}`, {
      taskId: task.id,
    });
  } finally {
    updateAgentStatus(agent.id, "online");
  }
}

export function refreshObjectiveStatus(objectiveId: string) {
  const tasks = listTasks(objectiveId);
  if (tasks.length === 0) return;
  if (tasks.every((t) => t.status === "completed")) {
    updateObjectiveStatus(objectiveId, "completed");
    emitEvent("success", "orchestrator", "Objective completed", { objectiveId });
  } else if (tasks.some((t) => t.status === "failed" || t.status === "blocked")) {
    // keep active so suite can continue other work; mark only if all terminal-fail
    const terminal = tasks.every((t) =>
      ["completed", "failed", "blocked"].includes(t.status),
    );
    if (terminal && tasks.some((t) => t.status !== "completed")) {
      updateObjectiveStatus(objectiveId, "failed");
    }
  }
}

export function orchestrateTick(): {
  processed: number;
  spawned: number;
  heartbeats: number;
} {
  ensureBuiltinAgents();
  heartbeatAllOnline();

  // Mark idle agents as waiting (forever online)
  for (const agent of listAgents()) {
    if (agent.status === "online") {
      updateAgentStatus(agent.id, "waiting");
    }
  }

  let processed = 0;
  const beforeAgents = listAgents().length;

  const objectives = listObjectives()
    .filter((o) => o.status === "active")
    .sort((a, b) => a.priority - b.priority);

  for (const objective of objectives) {
    decomposeObjective(objective);
  }

  // Process one queued task per tick to keep turns fair
  const queued = listTasks().filter((t) => t.status === "queued");
  // Prefer tasks from higher-priority objectives
  queued.sort((a, b) => {
    const oa = listObjectives().find((o) => o.id === a.objectiveId)?.priority ?? 99;
    const ob = listObjectives().find((o) => o.id === b.objectiveId)?.priority ?? 99;
    return oa - ob;
  });

  const next = queued[0];
  if (next) {
    executeTask(next);
    processed += 1;
    refreshObjectiveStatus(next.objectiveId);
  }

  // Keep all agents online/waiting after tick
  for (const agent of listAgents()) {
    if (agent.status !== "busy") {
      updateAgentStatus(agent.id, "waiting");
    }
  }
  heartbeatAllOnline();

  const spawned = listAgents().length - beforeAgents;
  return {
    processed,
    spawned: Math.max(0, spawned),
    heartbeats: listAgents().length,
  };
}

export function submitObjective(input: {
  title: string;
  description: string;
  priority?: number;
}) {
  ensureBuiltinAgents();
  const objective = createObjective(input);
  decomposeObjective(objective);
  emitEvent("info", "orchestrator", `Queued objective pipeline for "${objective.title}"`, {
    objectiveId: objective.id,
  });
  return objective;
}
