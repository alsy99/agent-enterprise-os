import { z } from "zod";

export const AgentStatusSchema = z.enum([
  "online",
  "busy",
  "waiting",
  "learning",
  "blocked",
  "offline",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const TaskStatusSchema = z.enum([
  "queued",
  "assigned",
  "running",
  "awaiting_handoff",
  "completed",
  "failed",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const ObjectiveStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "failed",
]);
export type ObjectiveStatus = z.infer<typeof ObjectiveStatusSchema>;

export const GuardrailSchema = z.object({
  id: z.string(),
  rule: z.string(),
  severity: z.enum(["warn", "block"]),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export const AgentSpecSchema = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  rules: z.array(z.string()),
  guardrails: z.array(GuardrailSchema),
  systemPrompt: z.string(),
  maxConcurrency: z.number().int().positive().default(1),
});
export type AgentSpec = z.infer<typeof AgentSpecSchema>;

export type AgentRecord = {
  id: string;
  type: string;
  name: string;
  status: AgentStatus;
  rules: string[];
  guardrails: Guardrail[];
  capabilities: string[];
  systemPrompt: string;
  playbook: string[];
  stats: {
    completed: number;
    failed: number;
    lessons: number;
  };
  createdAt: string;
  lastSeenAt: string;
  lastHeartbeatAt: string;
};

export type Objective = {
  id: string;
  title: string;
  description: string;
  status: ObjectiveStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type Task = {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  requiredCapability: string;
  status: TaskStatus;
  assignedAgentId?: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type MemoryEntry = {
  id: string;
  agentId: string;
  kind: "lesson" | "context" | "handoff_in" | "handoff_out" | "observation";
  content: string;
  tags: string[];
  relatedTaskId?: string;
  relatedObjectiveId?: string;
  createdAt: string;
  importance: number;
};

export type Handoff = {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  objectiveId: string;
  summary: string;
  context: Record<string, unknown>;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  acceptedAt?: string;
};

export type SuiteEvent = {
  id: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type WorkerState = {
  running: boolean;
  startedAt?: string;
  lastTickAt?: string;
  ticks: number;
  mode: "local" | "embedded";
};
