import { skillForCapability, loadSkill } from "./skills";
import {
  addMemory,
  addMessage,
  bumpAgentStats,
  createObjective,
  createTask,
  emitEvent,
  getAgent,
  listMessages,
  listObjectives,
  listTasks,
  listTasksForAgent,
  updateAgentPlaybook,
  updateAgentStatus,
  updateObjectiveStatus,
  updateTask,
} from "./store";
import { executeTask } from "./orchestrator";
import type { AgentRecord, ChatMessage } from "./types";

function voiceLead(agent: AgentRecord, line: string) {
  return `${agent.personality.greeting}\n\n${line}`;
}

function agentTaskSummary(agent: AgentRecord) {
  const mine = listTasksForAgent(agent.id);
  const active = mine.filter((t) =>
    ["queued", "assigned", "running", "awaiting_handoff"].includes(t.status),
  );
  const done = mine.filter((t) => t.status === "completed");
  const failed = mine.filter((t) =>
    ["failed", "blocked"].includes(t.status),
  );

  const lines = [
    voiceLead(
      agent,
      `Status check — I'm ${agent.name}, ${agent.jobProfile}, a ${agent.personality.archetype} (${agent.status}).`,
    ),
    ``,
    `Active tasks: ${active.length}`,
    ...active.slice(0, 5).map((t) => {
      const obj = listObjectives().find((o) => o.id === t.objectiveId);
      return `- [${t.status}] ${t.title}${obj ? ` · ${obj.title}` : ""}`;
    }),
    ``,
    `Completed: ${done.length} · Failed/blocked: ${failed.length}`,
    `Lessons logged: ${agent.stats.lessons}`,
    ``,
    `(${agent.personality.quirk})`,
  ];

  if (active.length === 0 && done.length === 0) {
    lines.push(``, `No assigned work yet — hand me something with "assign: …".`);
  }

  if (agent.playbook[0]) {
    lines.push(``, `Latest learning: ${agent.playbook[0]}`);
  }

  return lines.join("\n");
}

function extractAssignBrief(message: string): string | null {
  const patterns = [
    /^(?:please\s+)?(?:assign|do|handle|take|work on|please do)[:\s-]+(.+)$/i,
    /^task[:\s-]+(.+)$/i,
    /^(?:can you|could you)\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = message.trim().match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  const soft = message.trim().match(
    /(?:assign yourself|i need you to|please)\s+(.+)/i,
  );
  if (soft?.[1]?.trim() && soft[1].trim().length > 8) return soft[1].trim();
  return null;
}

function isStatusAsk(message: string) {
  return /\b(status|update|progress|what('?| a)?re you (doing|working)|your tasks?|what('?s| is) (going|happening)|how('?s| is) it going)\b/i.test(
    message,
  );
}

function assignDirectTask(agent: AgentRecord, brief: string) {
  const primaryCap = agent.capabilities[0] ?? "general";
  const skill = skillForCapability(primaryCap);
  const objective = createObjective({
    title:
      brief.length > 72
        ? `${brief.slice(0, 69).trim()}…`
        : brief.charAt(0).toUpperCase() + brief.slice(1),
    description: `Direct assignment to ${agent.name}: ${brief}`,
    priority: 3,
  });

  const task = createTask({
    objectiveId: objective.id,
    title: `${agent.name}: ${objective.title}`,
    description: [
      `Direct user assignment to ${agent.name} (${agent.jobProfile}, ${agent.personality.archetype}).`,
      `Brief: ${brief}`,
      skill ? `Skill: ${skill.name}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    requiredCapability: primaryCap,
  });

  updateTask(task.id, {
    status: "queued",
    assignedAgentId: agent.id,
  });

  addMemory({
    agentId: agent.id,
    kind: "observation",
    content: `Decision: accepted direct assignment from user — "${brief}" (in character as ${agent.personality.archetype})`,
    tags: ["decision", "direct-assign"],
    relatedTaskId: task.id,
    relatedObjectiveId: objective.id,
    importance: 0.9,
  });

  emitEvent("info", agent.name, `Accepted direct task: ${brief}`, {
    objectiveId: objective.id,
    taskId: task.id,
    agentId: agent.id,
  });

  const queued = listTasks(objective.id).find((t) => t.id === task.id);
  if (queued) {
    updateTask(task.id, { assignedAgentId: agent.id, status: "queued" });
    executeTask({ ...queued, assignedAgentId: agent.id });
    const after = listTasks(objective.id);
    if (after.every((t) => t.status === "completed")) {
      updateObjectiveStatus(objective.id, "completed");
    }
  }

  const finished = listTasks(objective.id).find((t) => t.id === task.id);
  return { objective, task: finished ?? task };
}

function craftReply(
  agent: AgentRecord,
  message: string,
): { reply: string; meta?: Record<string, unknown> } {
  if (isStatusAsk(message)) {
    return {
      reply: agentTaskSummary(agent),
      meta: { intent: "status" },
    };
  }

  const assignBrief = extractAssignBrief(message);
  if (assignBrief) {
    const { objective, task } = assignDirectTask(agent, assignBrief);
    const resultPreview = task.result
      ? `\n\n### Output\n${task.result.slice(0, 1200)}`
      : `\n\nTask queued/running under objective "${objective.title}".`;

    return {
      reply: [
        voiceLead(
          agent,
          `On it — ${agent.personality.speechStyle}`,
        ),
        ``,
        `Assigned: ${task.title}`,
        `Status: ${task.status}`,
        resultPreview,
        ``,
        `(${agent.personality.quirk})`,
      ].join("\n"),
      meta: {
        intent: "assign",
        objectiveId: objective.id,
        taskId: task.id,
        status: task.status,
      },
    };
  }

  const active = listTasksForAgent(agent.id).filter((t) =>
    ["queued", "assigned", "running"].includes(t.status),
  );
  const skill = skillForCapability(agent.capabilities[0] ?? "");

  return {
    reply: [
      voiceLead(
        agent,
        `Noted — "${message}". ${agent.personality.voice}`,
      ),
      ``,
      active.length
        ? `I'm currently on: ${active.map((t) => t.title).join("; ")}.`
        : `I'm waiting for work.`,
      ``,
      `You can ask for a status update, or assign me with "assign: <task>".`,
      skill ? `Skill focus: ${skill.name}.` : "",
      ``,
      `(${agent.personality.quirk})`,
    ]
      .filter(Boolean)
      .join("\n"),
    meta: { intent: "chat" },
  };
}

export function chatWithAgent(
  agentId: string,
  content: string,
): { messages: ChatMessage[]; reply: ChatMessage } {
  const agent = getAgent(agentId);
  if (!agent) throw new Error("Agent not found");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message is required");

  addMessage({
    agentId,
    role: "user",
    content: trimmed,
  });

  updateAgentStatus(agentId, "busy");
  const { reply, meta } = craftReply(agent, trimmed);

  const agentMsg = addMessage({
    agentId,
    role: "agent",
    content: reply,
    meta,
  });

  if (meta?.intent === "assign") {
    const lesson = `${agent.name} (${agent.personality.archetype}) accepted a direct user assignment in-character and delivered a result.`;
    addMemory({
      agentId,
      kind: "lesson",
      content: lesson,
      tags: ["chat", "direct-assign", agent.personality.archetype],
      importance: 0.55,
    });
    bumpAgentStats(agentId, "lessons");
    const fresh = getAgent(agentId);
    if (fresh && !fresh.playbook.includes(lesson)) {
      updateAgentPlaybook(agentId, [lesson, ...fresh.playbook].slice(0, 25));
    }
  }

  updateAgentStatus(agentId, "waiting");
  return { messages: listMessages(agentId), reply: agentMsg };
}

export function getAgentChat(agentId: string) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error("Agent not found");
  return {
    agent,
    messages: listMessages(agentId),
    tasks: listTasksForAgent(agentId),
  };
}
