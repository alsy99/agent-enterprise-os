import {
  bumpAgentStats,
  createAgent,
  createHandoff,
  createObjective,
  createTask,
  emitEvent,
  getAgent,
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
  listTakenArchetypes,
} from "./templates";
import {
  inventPersonality,
} from "./personality";
import {
  defaultPipelineSkills,
  listSkillMetadata,
  loadSkill,
  matchSkillsForBrief,
  skillForCapability,
  type SkillMetadata,
} from "./skills";
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
        personality: spec.personality,
        status: "online",
      });
      continue;
    }

    const needsPersonality =
      !match.personality?.archetype || match.personality.archetype === "";
    if (
      match.name !== spec.name ||
      match.jobProfile !== spec.jobProfile ||
      !match.jobProfile ||
      needsPersonality
    ) {
      updateAgentIdentity(match.id, {
        name: spec.name,
        jobProfile: spec.jobProfile,
        systemPrompt: spec.systemPrompt,
        personality: spec.personality,
      });
    }
  }

  for (const agent of listAgents()) {
    if (!agent.type.startsWith("specialist_")) continue;
    const capability = agent.type.replace("specialist_", "");
    const preferredByCap: Record<string, string> = {
      security: "Night-watch sentinel",
      docs: "Story-minded scribe",
      design: "Sparky tinkerer",
      data: "Stoic operator",
      testing: "Exacting editor",
      ops: "Stoic operator",
      support: "Warm diplomat",
    };
    const preferred = preferredByCap[capability];
    const needsPersonality =
      !agent.personality?.archetype ||
      (preferred && agent.personality.archetype !== preferred) ||
      (agent.personality.archetype === "Calm strategist" &&
        agent.name !== "Nova");
    const looksGenericName =
      agent.name.toLowerCase().includes("specialist") ||
      !agent.jobProfile ||
      agent.name === agent.jobProfile;
    if (!needsPersonality && !looksGenericName) continue;

    const taken = takenNames([agent.name]);
    const name = looksGenericName
      ? allocateUniqueName(taken, capability)
      : agent.name;
    const takenArch = listTakenArchetypes(
      listAgents().map((a) => a.personality),
    );
    const personality = needsPersonality
      ? inventPersonality(name, capability, takenArch)
      : agent.personality;
    const title = looksGenericName
      ? inventSpecForCapability(capability, taken, takenArch).jobProfile
      : agent.jobProfile;
    updateAgentIdentity(agent.id, {
      name,
      jobProfile: title,
      personality,
      systemPrompt: `You are ${name}, ${title} — a ${personality.archetype}. Voice: ${personality.voice} Style: ${personality.speechStyle} Quirk: ${personality.quirk}. Follow your rules, honor guardrails, learn from outcomes, and leave clean handoff context.`,
    });
  }
}

export function spawnAgentForCapability(capability: string): AgentRecord {
  const taken = takenNames();
  const takenArch = listTakenArchetypes(listAgents().map((a) => a.personality));
  const spec = inventSpecForCapability(capability, taken, takenArch);
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
        "Nova",
        `Spawn blocked by guardrail; reusing ${waiting.name} (${waiting.personality.archetype})`,
        { capability },
      );
      return waiting;
    }
  }

  const name =
    sameType === 0
      ? spec.name
      : allocateUniqueName(taken, `${capability}${sameType + 1}`);

  const personality =
    sameType === 0
      ? spec.personality
      : inventPersonality(name, capability, takenArch);

  const agent = createAgent({
    type: spec.type,
    name,
    jobProfile: spec.jobProfile,
    rules: spec.rules,
    guardrails: spec.guardrails,
    capabilities: spec.capabilities,
    systemPrompt: spec.systemPrompt
      .replace(spec.name, name)
      .replace(spec.personality.archetype, personality.archetype),
    personality,
    status: "online",
  });

  emitEvent(
    "success",
    "Nova",
    `Hatched ${agent.name} — ${agent.jobProfile}, ${agent.personality.archetype}. ${agent.personality.greeting}`,
    { agentId: agent.id, capability, personality: agent.personality },
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

  ensureBuiltinAgents();

  // Level 2: load Nova skill instructions only while planning.
  const novaSkill = loadSkill("nova-orchestrate");
  const brief = `${objective.title}\n${objective.description}`;

  // Level 1 discovery via skill descriptions (what + when).
  const matched = matchSkillsForBrief(brief).filter(
    (s) => s.id !== "nova-orchestrate",
  );
  const pipeline = defaultPipelineSkills();

  const coreOrder = ["research", "build", "review", "learn"];
  const specialists = matched
    .map((s) => s.capability)
    .filter((cap) => !coreOrder.includes(cap));

  const hint = objective.description.match(/\[cap:([a-z0-9_-]+)\]/i);
  if (hint) {
    const capability = hint[1].toLowerCase();
    if (!specialists.includes(capability) && !coreOrder.includes(capability)) {
      specialists.push(capability);
    }
  }

  const orderedCaps = [
    "research",
    ...specialists.slice(0, 2),
    "build",
    "review",
    "learn",
  ];

  const skillByCap = new Map<string, SkillMetadata>();
  for (const s of [...pipeline, ...matched]) {
    skillByCap.set(s.capability, s);
  }
  if (hint) {
    const capability = hint[1].toLowerCase();
    const existingSkill = skillForCapability(capability);
    if (existingSkill) skillByCap.set(capability, existingSkill);
  }

  const plan = orderedCaps.map((capability) => {
    const skill = skillByCap.get(capability);
    const skillName = skill?.name ?? capability;
    return {
      title: `${skillName}: ${objective.title}`,
      description: [
        `Nova (orchestrator-workers) routed this step via skill "${skillName}".`,
        `Capability: ${capability}.`,
        `Objective: ${objective.description}`,
        skill?.description ? `When-to-use: ${skill.description}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      requiredCapability: capability,
      skillId: skill?.id,
    };
  });

  const tasks = plan.map((p) =>
    createTask({
      objectiveId: objective.id,
      title: p.title,
      description: p.description,
      requiredCapability: p.requiredCapability,
    }),
  );

  const rationale = plan
    .map((p) => `${p.requiredCapability}${p.skillId ? `@${p.skillId}` : ""}`)
    .join(" → ");

  emitEvent(
    "info",
    "Nova",
    `Orchestrator-workers plan for "${objective.title}": ${rationale}`,
    {
      objectiveId: objective.id,
      pattern: "orchestrator-workers",
      skills: plan.map((p) => p.skillId).filter(Boolean),
      novaSkillLoaded: Boolean(novaSkill),
    },
  );

  const nova = listAgents().find((a) => a.type === "orchestrator");
  if (nova) {
    addMemory({
      agentId: nova.id,
      kind: "observation",
      content: `Decision (transparent plan): ${rationale}. Matched skills: ${
        matched.map((m) => m.name).join(", ") || "default pipeline"
      }.`,
      tags: ["decision", "plan", "orchestrator-workers"],
      relatedObjectiveId: objective.id,
      importance: 0.9,
    });
  }

  return tasks;
}

/** Nova turns a single user brief into a titled objective + execution plan. */
export function planFromBrief(brief: string): {
  title: string;
  description: string;
  priority: number;
} {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  const withoutHint = cleaned.replace(/\s*\[cap:[^\]]+\]/gi, "").trim();

  let title = withoutHint;
  const sentence = withoutHint.split(/[.!?]/)[0]?.trim() ?? withoutHint;
  if (sentence.length > 0 && sentence.length <= 72) {
    title = sentence;
  } else if (withoutHint.length > 72) {
    title = `${withoutHint.slice(0, 69).trim()}…`;
  }

  // Capitalize first letter for display
  title = title.charAt(0).toUpperCase() + title.slice(1);

  let priority = 5;
  if (/\b(urgent|asap|critical|p0|immediately)\b/i.test(cleaned)) priority = 1;
  else if (/\b(high priority|important|soon)\b/i.test(cleaned)) priority = 2;
  else if (/\b(low priority|whenever|someday)\b/i.test(cleaned)) priority = 8;

  return {
    title,
    description: cleaned,
    priority,
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
  emitEvent("info", "Nova", `Accepted objective "${objective.title}" and queued the team`, {
    objectiveId: objective.id,
  });
  return objective;
}

function detectDirectIntent(
  brief: string,
): "introduce-agents" | "list-skills" | null {
  const t = brief.toLowerCase();
  if (
    /\b(introduce|meet|who\s+are|show|list|present).{0,40}\b(agents?|team|crew|roster)\b/.test(
      t,
    ) ||
    /\b(agents?|team|crew|roster).{0,40}\b(introduce|meet|who|are|you)\b/.test(t)
  ) {
    return "introduce-agents";
  }
  if (/\b(list|show|what|which).{0,30}\bskills?\b/.test(t)) {
    return "list-skills";
  }
  return null;
}

function buildAgentIntroduction(): string {
  const agents = listAgents();
  const lines = [
    `# Meet the Agent Suite`,
    ``,
    `Nova here — these are the forever-online teammates currently on the roster:`,
    ``,
  ];
  for (const agent of agents) {
    lines.push(`## ${agent.name} — ${agent.jobProfile}`);
    lines.push(`Character: ${agent.personality.archetype}`);
    lines.push(`Traits: ${agent.personality.traits.join(", ")}`);
    lines.push(`Voice: ${agent.personality.voice}`);
    lines.push(`Quirk: ${agent.personality.quirk}`);
    lines.push(`Status: ${agent.status}`);
    lines.push(`Focus: ${agent.capabilities.join(", ")}`);
    lines.push(`Greeting: "${agent.personality.greeting}"`);
    lines.push(``);
  }
  lines.push(
    `How we work: you give me one brief; I match Skills and assign workers (orchestrator-workers).`,
  );
  lines.push(
    `Note: workers are real suite agents (routing, skills, memory, guardrails). Their writing is skill-driven and deterministic unless you plug in an LLM later.`,
  );
  return lines.join("\n");
}

function buildSkillsIntroduction(): string {
  const skills = listSkillMetadata();
  const lines = [`# Available Skills`, ``];
  for (const skill of skills) {
    lines.push(`## ${skill.name} (\`${skill.capability}\`)`);
    lines.push(skill.description);
    lines.push(``);
  }
  return lines.join("\n");
}

/** Meta asks get a direct Nova answer instead of a fake research→build pipeline. */
function fulfillDirectAnswer(
  brief: string,
  intent: "introduce-agents" | "list-skills",
) {
  ensureBuiltinAgents();
  const nova = listAgents().find((a) => a.type === "orchestrator");
  if (!nova) throw new Error("Nova is offline");

  const title =
    intent === "introduce-agents"
      ? "Introduce the agent roster"
      : "List available skills";
  const output =
    intent === "introduce-agents"
      ? buildAgentIntroduction()
      : buildSkillsIntroduction();

  const objective = createObjective({
    title,
    description: brief.trim(),
    priority: 3,
  });

  const task = createTask({
    objectiveId: objective.id,
    title: `Nova answers: ${title}`,
    description: `Direct orchestrator response (no worker pipeline) for: ${brief}`,
    requiredCapability: "orchestrate",
  });

  updateAgentStatus(nova.id, "busy");
  updateTask(task.id, {
    status: "running",
    assignedAgentId: nova.id,
    startedAt: new Date().toISOString(),
  });

  addMemory({
    agentId: nova.id,
    kind: "observation",
    content: `Decision: answered directly instead of spawning a worker pipeline because the brief is a meta request (${intent}).`,
    tags: ["decision", "direct-answer", intent],
    relatedTaskId: task.id,
    relatedObjectiveId: objective.id,
    importance: 0.95,
  });

  updateTask(task.id, {
    status: "completed",
    result: output,
    completedAt: new Date().toISOString(),
    error: null,
  });
  bumpAgentStats(nova.id, "completed");

  const lesson = `${nova.name} learned: meta asks like "${title}" should be answered directly with the live roster/skills — do not run research→build→review for introductions.`;
  addMemory({
    agentId: nova.id,
    kind: "lesson",
    content: lesson,
    tags: ["learning", "direct-answer", intent],
    relatedTaskId: task.id,
    relatedObjectiveId: objective.id,
    importance: 0.85,
  });
  bumpAgentStats(nova.id, "lessons");
  const playbook = [lesson, ...nova.playbook.filter((p) => p !== lesson)].slice(
    0,
    25,
  );
  updateAgentPlaybook(nova.id, playbook);

  updateObjectiveStatus(objective.id, "completed");
  updateAgentStatus(nova.id, "waiting");

  emitEvent("success", "Nova", `Direct answer ready: ${title}`, {
    objectiveId: objective.id,
    pattern: "direct-response",
  });

  return {
    ...objective,
    status: "completed" as const,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function submitTaskBrief(brief: string) {
  ensureBuiltinAgents();
  const intent = detectDirectIntent(brief);
  if (intent) {
    emitEvent("info", "Nova", `Meta request detected (${intent}) — answering directly`, {
      intent,
    });
    return fulfillDirectAnswer(brief, intent);
  }
  const plan = planFromBrief(brief);
  emitEvent("info", "Nova", `Interpreting task: "${plan.title}"`, {
    priority: plan.priority,
  });
  return submitObjective(plan);
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
  const skillMeta = skillForCapability(task.requiredCapability);
  const skill = skillMeta ? loadSkill(skillMeta.id) : null;
  const memories = listMemories(agent.id, 5)
    .map((m) => `- (${m.kind}) ${m.content}`)
    .join("\n");
  const playbook = agent.playbook.slice(0, 5).map((p) => `- ${p}`).join("\n");

  const skillGuidance = skill
    ? skill.instructions.split("\n").slice(0, 24).join("\n")
    : "No bundled skill — follow agent rules and guardrails.";

  const deliverable =
    agent.type === "researcher"
      ? [
          `Brief for "${objective.title}"`,
          ``,
          `Goal: ${objective.description}`,
          `Knowns: suite has ${listAgents().length} online agents; Skills are filesystem-based.`,
          `Unknowns: anything not stated in the brief.`,
          `Recommended next: ${skillForCapability("build") ? "implement" : "specialist"} with a minimal first slice.`,
        ].join("\n")
      : agent.type === "builder"
        ? [
            `First slice for "${objective.title}"`,
            ``,
            `1. Restate ask: ${objective.description}`,
            `2. Concrete steps: clarify acceptance → draft artifact → hand to review`,
            `3. Artifact outline ready for Sable to validate.`,
          ].join("\n")
        : agent.type === "reviewer"
          ? [
              `Review of "${objective.title}"`,
              `Verdict: pass`,
              `Checked: objective restated, artifact exists, handoff names next owner.`,
              `Finding: proceed to learn consolidation.`,
            ].join("\n")
          : agent.type === "learner"
            ? `Consolidated lessons for "${objective.title}" into participating agent playbooks.`
            : [
                `${agent.name} (${agent.jobProfile}) on "${objective.title}"`,
                `Capability: ${task.requiredCapability}`,
                `Produced specialist notes tied to: ${objective.description}`,
              ].join("\n");

  return [
    `## ${task.title}`,
    ``,
    `Agent: ${agent.name} · ${agent.jobProfile}`,
    `Character: ${agent.personality.archetype} — ${agent.personality.traits.join(", ")}`,
    `Voice note: ${agent.personality.speechStyle}`,
    `Skill: ${skill?.name ?? "ad-hoc"}`,
    ``,
    `### Decision`,
    `Assigned because this step needs "${task.requiredCapability}" and ${agent.name} covers it.`,
    ``,
    `### Output`,
    deliverable,
    ``,
    `### Skill guidance (loaded on trigger)`,
    skillGuidance,
    playbook ? `\n### Active playbook\n${playbook}` : "",
    memories ? `\n### Recalled context\n${memories}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function learnFromTask(agent: AgentRecord, task: Task, success: boolean) {
  const objective = listObjectives().find((o) => o.id === task.objectiveId);
  const objectiveTitle = objective?.title ?? "the objective";

  const lesson = success
    ? `${agent.name} (${agent.jobProfile}) finished "${task.title}" for "${objectiveTitle}". Keep: cite the objective constraints, name the next owner in the handoff, and attach one concrete artifact line.`
    : `${agent.name} blocked on "${task.title}" for "${objectiveTitle}". Next time: log the exact guardrail/error and ask Nova to reassign ${task.requiredCapability}.`;

  addMemory({
    agentId: agent.id,
    kind: "lesson",
    content: lesson,
    tags: [task.requiredCapability, success ? "success" : "failure", "learning"],
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

  if (task.requiredCapability === "learn" && objective) {
    const peers = listAgents().filter(
      (a) =>
        a.id !== agent.id &&
        listTasks(objective.id).some((t) => t.assignedAgentId === a.id),
    );
    for (const peer of peers) {
      const peerLesson = `${agent.name} → ${peer.name}: after "${objectiveTitle}", keep handoffs explicit for ${peer.jobProfile} work (what changed + what to do next).`;
      const next = [
        peerLesson,
        ...peer.playbook.filter((p) => p !== peerLesson),
      ].slice(0, 25);
      updateAgentPlaybook(peer.id, next);
      addMemory({
        agentId: peer.id,
        kind: "lesson",
        content: peerLesson,
        tags: ["suite-learning", peer.type, objectiveTitle],
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

  // Honor direct user assignment when present and capable.
  const preassigned = task.assignedAgentId
    ? getAgent(task.assignedAgentId)
    : null;
  const agent =
    preassigned &&
    (preassigned.capabilities.includes(task.requiredCapability) ||
      preassigned.capabilities.includes("general") ||
      preassigned.type === "orchestrator")
      ? preassigned
      : ensureAgentForCapability(task.requiredCapability);

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
    content: preassigned
      ? `Decision: user assigned ${agent.name} (${agent.jobProfile}) directly for "${task.requiredCapability}".`
      : `Decision: Nova assigned ${agent.name} (${agent.jobProfile}) because this step requires "${task.requiredCapability}". Why: ${agent.name} is available and covers that capability under suite rules.`,
    tags: ["decision", "assignment", task.requiredCapability],
    relatedTaskId: task.id,
    relatedObjectiveId: objective.id,
    importance: 0.75,
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
