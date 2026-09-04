import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import type {
  AgentRecord,
  AgentStatus,
  Guardrail,
  Handoff,
  MemoryEntry,
  Objective,
  SuiteEvent,
  Task,
} from "./types";

function now() {
  return new Date().toISOString();
}

export function emitEvent(
  level: SuiteEvent["level"],
  source: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const db = getDb();
  const event: SuiteEvent = {
    id: uuid(),
    level,
    source,
    message,
    meta,
    createdAt: now(),
  };
  db.prepare(
    `INSERT INTO events (id, level, source, message, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.level,
    event.source,
    event.message,
    meta ? JSON.stringify(meta) : null,
    event.createdAt,
  );
  return event;
}

export function listEvents(limit = 80): SuiteEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM events ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    level: SuiteEvent["level"];
    source: string;
    message: string;
    meta_json: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    level: r.level,
    source: r.source,
    message: r.message,
    meta: r.meta_json ? JSON.parse(r.meta_json) : undefined,
    createdAt: r.created_at,
  }));
}

function rowToAgent(r: Record<string, unknown>): AgentRecord {
  return {
    id: r.id as string,
    type: r.type as string,
    name: r.name as string,
    jobProfile: (r.job_profile as string) || fallbackJobProfile(r.type as string),
    status: r.status as AgentStatus,
    rules: JSON.parse(r.rules_json as string),
    guardrails: JSON.parse(r.guardrails_json as string) as Guardrail[],
    capabilities: JSON.parse(r.capabilities_json as string),
    systemPrompt: r.system_prompt as string,
    playbook: JSON.parse((r.playbook_json as string) || "[]"),
    stats: JSON.parse(r.stats_json as string),
    createdAt: r.created_at as string,
    lastSeenAt: r.last_seen_at as string,
    lastHeartbeatAt: r.last_heartbeat_at as string,
  };
}

function fallbackJobProfile(type: string): string {
  const map: Record<string, string> = {
    orchestrator: "Chief Orchestrator",
    researcher: "Research Analyst",
    builder: "Implementation Engineer",
    reviewer: "Quality Reviewer",
    learner: "Learning Strategist",
  };
  if (map[type]) return map[type];
  if (type.startsWith("specialist_")) {
    const cap = type.replace("specialist_", "");
    return `${cap.charAt(0).toUpperCase()}${cap.slice(1)} Specialist`;
  }
  return "Suite Agent";
}

export function listAgents(): AgentRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM agents ORDER BY created_at ASC`)
    .all() as Array<Record<string, unknown>>;
  return rows.map(rowToAgent);
}

export function getAgent(id: string): AgentRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM agents WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToAgent(row) : null;
}

export function createAgent(input: {
  type: string;
  name: string;
  jobProfile: string;
  rules: string[];
  guardrails: Guardrail[];
  capabilities: string[];
  systemPrompt: string;
  status?: AgentStatus;
}): AgentRecord {
  const ts = now();
  const agent: AgentRecord = {
    id: uuid(),
    type: input.type,
    name: input.name,
    jobProfile: input.jobProfile,
    status: input.status ?? "online",
    rules: input.rules,
    guardrails: input.guardrails,
    capabilities: input.capabilities,
    systemPrompt: input.systemPrompt,
    playbook: [],
    stats: { completed: 0, failed: 0, lessons: 0 },
    createdAt: ts,
    lastSeenAt: ts,
    lastHeartbeatAt: ts,
  };

  getDb()
    .prepare(
      `INSERT INTO agents (
        id, type, name, job_profile, status, rules_json, guardrails_json, capabilities_json,
        system_prompt, playbook_json, stats_json, created_at, last_seen_at, last_heartbeat_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      agent.id,
      agent.type,
      agent.name,
      agent.jobProfile,
      agent.status,
      JSON.stringify(agent.rules),
      JSON.stringify(agent.guardrails),
      JSON.stringify(agent.capabilities),
      agent.systemPrompt,
      JSON.stringify(agent.playbook),
      JSON.stringify(agent.stats),
      agent.createdAt,
      agent.lastSeenAt,
      agent.lastHeartbeatAt,
    );

  emitEvent("success", "registry", `Agent online: ${agent.name} · ${agent.jobProfile}`, {
    agentId: agent.id,
    type: agent.type,
  });

  return agent;
}

export function updateAgentIdentity(
  id: string,
  input: { name: string; jobProfile: string; systemPrompt?: string },
) {
  if (input.systemPrompt) {
    getDb()
      .prepare(
        `UPDATE agents SET name = ?, job_profile = ?, system_prompt = ? WHERE id = ?`,
      )
      .run(input.name, input.jobProfile, input.systemPrompt, id);
  } else {
    getDb()
      .prepare(`UPDATE agents SET name = ?, job_profile = ? WHERE id = ?`)
      .run(input.name, input.jobProfile, id);
  }
}

export function updateAgentStatus(id: string, status: AgentStatus) {
  const ts = now();
  getDb()
    .prepare(
      `UPDATE agents SET status = ?, last_seen_at = ?, last_heartbeat_at = ? WHERE id = ?`,
    )
    .run(status, ts, ts, id);
}

export function heartbeatAgent(id: string) {
  const ts = now();
  getDb()
    .prepare(
      `UPDATE agents SET last_heartbeat_at = ?, last_seen_at = ?, status = CASE WHEN status = 'offline' THEN 'online' ELSE status END WHERE id = ?`,
    )
    .run(ts, ts, id);
}

export function heartbeatAllOnline() {
  const ts = now();
  getDb()
    .prepare(
      `UPDATE agents SET last_heartbeat_at = ?, last_seen_at = ? WHERE status IN ('online', 'waiting', 'busy', 'learning')`,
    )
    .run(ts, ts);
}

export function updateAgentPlaybook(id: string, playbook: string[]) {
  getDb()
    .prepare(`UPDATE agents SET playbook_json = ? WHERE id = ?`)
    .run(JSON.stringify(playbook), id);
}

export function bumpAgentStats(
  id: string,
  field: "completed" | "failed" | "lessons",
  by = 1,
) {
  const agent = getAgent(id);
  if (!agent) return;
  agent.stats[field] += by;
  getDb()
    .prepare(`UPDATE agents SET stats_json = ? WHERE id = ?`)
    .run(JSON.stringify(agent.stats), id);
}

export function listObjectives(): Objective[] {
  const rows = getDb()
    .prepare(`SELECT * FROM objectives ORDER BY priority ASC, created_at DESC`)
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: r.description as string,
    status: r.status as Objective["status"],
    priority: r.priority as number,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    completedAt: (r.completed_at as string) || undefined,
  }));
}

export function createObjective(input: {
  title: string;
  description: string;
  priority?: number;
}): Objective {
  const ts = now();
  const objective: Objective = {
    id: uuid(),
    title: input.title,
    description: input.description,
    status: "active",
    priority: input.priority ?? 5,
    createdAt: ts,
    updatedAt: ts,
  };
  getDb()
    .prepare(
      `INSERT INTO objectives (id, title, description, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      objective.id,
      objective.title,
      objective.description,
      objective.status,
      objective.priority,
      objective.createdAt,
      objective.updatedAt,
    );
  emitEvent("info", "objectives", `Objective created: ${objective.title}`, {
    objectiveId: objective.id,
  });
  return objective;
}

export function updateObjectiveStatus(
  id: string,
  status: Objective["status"],
) {
  const ts = now();
  getDb()
    .prepare(
      `UPDATE objectives SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
    )
    .run(status, ts, status === "completed" ? ts : null, id);
}

export function listTasks(objectiveId?: string): Task[] {
  const rows = (
    objectiveId
      ? getDb()
          .prepare(
            `SELECT * FROM tasks WHERE objective_id = ? ORDER BY created_at ASC`,
          )
          .all(objectiveId)
      : getDb()
          .prepare(`SELECT * FROM tasks ORDER BY created_at DESC`)
          .all()
  ) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: r.id as string,
    objectiveId: r.objective_id as string,
    title: r.title as string,
    description: r.description as string,
    requiredCapability: r.required_capability as string,
    status: r.status as Task["status"],
    assignedAgentId: (r.assigned_agent_id as string) || undefined,
    result: (r.result as string) || undefined,
    error: (r.error as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    startedAt: (r.started_at as string) || undefined,
    completedAt: (r.completed_at as string) || undefined,
  }));
}

export function createTask(input: {
  objectiveId: string;
  title: string;
  description: string;
  requiredCapability: string;
}): Task {
  const ts = now();
  const task: Task = {
    id: uuid(),
    objectiveId: input.objectiveId,
    title: input.title,
    description: input.description,
    requiredCapability: input.requiredCapability,
    status: "queued",
    createdAt: ts,
    updatedAt: ts,
  };
  getDb()
    .prepare(
      `INSERT INTO tasks (
        id, objective_id, title, description, required_capability, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      task.id,
      task.objectiveId,
      task.title,
      task.description,
      task.requiredCapability,
      task.status,
      task.createdAt,
      task.updatedAt,
    );
  return task;
}

export function updateTask(
  id: string,
  patch: Partial<{
    status: Task["status"];
    assignedAgentId: string | null;
    result: string | null;
    error: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>,
) {
  const current = getDb()
    .prepare(`SELECT * FROM tasks WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!current) return;

  const ts = now();
  getDb()
    .prepare(
      `UPDATE tasks SET
        status = ?,
        assigned_agent_id = ?,
        result = ?,
        error = ?,
        updated_at = ?,
        started_at = ?,
        completed_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.status ?? current.status,
      patch.assignedAgentId === undefined
        ? current.assigned_agent_id
        : patch.assignedAgentId,
      patch.result === undefined ? current.result : patch.result,
      patch.error === undefined ? current.error : patch.error,
      ts,
      patch.startedAt === undefined ? current.started_at : patch.startedAt,
      patch.completedAt === undefined ? current.completed_at : patch.completedAt,
      id,
    );
}

export function addMemory(input: {
  agentId: string;
  kind: MemoryEntry["kind"];
  content: string;
  tags?: string[];
  relatedTaskId?: string;
  relatedObjectiveId?: string;
  importance?: number;
}): MemoryEntry {
  const memory: MemoryEntry = {
    id: uuid(),
    agentId: input.agentId,
    kind: input.kind,
    content: input.content,
    tags: input.tags ?? [],
    relatedTaskId: input.relatedTaskId,
    relatedObjectiveId: input.relatedObjectiveId,
    createdAt: now(),
    importance: input.importance ?? 0.5,
  };
  getDb()
    .prepare(
      `INSERT INTO memories (
        id, agent_id, kind, content, tags_json, related_task_id, related_objective_id, created_at, importance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      memory.id,
      memory.agentId,
      memory.kind,
      memory.content,
      JSON.stringify(memory.tags),
      memory.relatedTaskId ?? null,
      memory.relatedObjectiveId ?? null,
      memory.createdAt,
      memory.importance,
    );
  return memory;
}

export function listMemories(agentId?: string, limit = 50): MemoryEntry[] {
  const rows = (
    agentId
      ? getDb()
          .prepare(
            `SELECT * FROM memories WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?`,
          )
          .all(agentId, limit)
      : getDb()
          .prepare(
            `SELECT * FROM memories ORDER BY created_at DESC LIMIT ?`,
          )
          .all(limit)
  ) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: r.id as string,
    agentId: r.agent_id as string,
    kind: r.kind as MemoryEntry["kind"],
    content: r.content as string,
    tags: JSON.parse(r.tags_json as string),
    relatedTaskId: (r.related_task_id as string) || undefined,
    relatedObjectiveId: (r.related_objective_id as string) || undefined,
    createdAt: r.created_at as string,
    importance: r.importance as number,
  }));
}

export function createHandoff(input: {
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  objectiveId: string;
  summary: string;
  context: Record<string, unknown>;
}): Handoff {
  const handoff: Handoff = {
    id: uuid(),
    fromAgentId: input.fromAgentId,
    toAgentId: input.toAgentId,
    taskId: input.taskId,
    objectiveId: input.objectiveId,
    summary: input.summary,
    context: input.context,
    status: "pending",
    createdAt: now(),
  };
  getDb()
    .prepare(
      `INSERT INTO handoffs (
        id, from_agent_id, to_agent_id, task_id, objective_id, summary, context_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      handoff.id,
      handoff.fromAgentId,
      handoff.toAgentId,
      handoff.taskId,
      handoff.objectiveId,
      handoff.summary,
      JSON.stringify(handoff.context),
      handoff.status,
      handoff.createdAt,
    );
  emitEvent("info", "handoff", handoff.summary, {
    handoffId: handoff.id,
    from: handoff.fromAgentId,
    to: handoff.toAgentId,
  });
  return handoff;
}

export function listHandoffs(limit = 40): Handoff[] {
  const rows = getDb()
    .prepare(`SELECT * FROM handoffs ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    fromAgentId: r.from_agent_id as string,
    toAgentId: r.to_agent_id as string,
    taskId: r.task_id as string,
    objectiveId: r.objective_id as string,
    summary: r.summary as string,
    context: JSON.parse(r.context_json as string),
    status: r.status as Handoff["status"],
    createdAt: r.created_at as string,
    acceptedAt: (r.accepted_at as string) || undefined,
  }));
}

export function acceptHandoff(id: string) {
  const ts = now();
  getDb()
    .prepare(
      `UPDATE handoffs SET status = 'accepted', accepted_at = ? WHERE id = ?`,
    )
    .run(ts, id);
}

export function getWorkerMeta(key: string): string | null {
  const row = getDb()
    .prepare(`SELECT value FROM worker_meta WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setWorkerMeta(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO worker_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}
