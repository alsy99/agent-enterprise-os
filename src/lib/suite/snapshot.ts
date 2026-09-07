import { ensureSuiteAwake } from "@/lib/suite";
import { ensureBuiltinAgents } from "@/lib/suite/orchestrator";
import { listSkillMetadata } from "@/lib/suite/skills";
import {
  listAgents,
  listEventsForObjective,
  listHandoffsForObjective,
  listMemoriesForObjective,
  listObjectives,
  listTasks,
} from "@/lib/suite/store";
import { getWorkerState, startWorker } from "@/lib/suite/worker";
import type {
  AgentRecord,
  Handoff,
  MemoryEntry,
  Objective,
  SuiteEvent,
  Task,
  WorkerState,
} from "@/lib/suite/types";

export type ObjectiveWithTasks = Objective & { tasks: Task[] };

export type HistoryTask = Task & {
  agent: { id: string; name: string; jobProfile: string } | null;
  decisions: MemoryEntry[];
  learnings: MemoryEntry[];
};

export type HistoryItem = {
  objective: Objective;
  tasks: HistoryTask[];
  participants: Array<{ id: string; name: string; jobProfile: string }>;
  handoffs: Array<
    Handoff & {
      from: { name: string; jobProfile: string } | null;
      to: { name: string; jobProfile: string } | null;
    }
  >;
  learnings: MemoryEntry[];
  decisions: MemoryEntry[];
  events: SuiteEvent[];
};

export type SkillMeta = {
  id: string;
  name: string;
  description: string;
  capability: string;
};

export type SuiteSnapshot = {
  worker: WorkerState;
  objectives: ObjectiveWithTasks[];
  agents: AgentRecord[];
  history: HistoryItem[];
  skills: SkillMeta[];
};

export type SuiteView = "board" | "history" | "agents" | "skills" | "talk";

const VIEW_IDS: SuiteView[] = ["board", "history", "agents", "skills", "talk"];

export function parseSuiteView(raw: string | string[] | undefined): SuiteView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && VIEW_IDS.includes(value as SuiteView)) return value as SuiteView;
  return "board";
}

function buildHistory(objectiveId?: string | null): HistoryItem[] {
  const agents = listAgents();
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return listObjectives()
    .filter((o) =>
      objectiveId
        ? o.id === objectiveId
        : o.status === "completed" || o.status === "failed",
    )
    .map((objective) => {
      const tasks = listTasks(objective.id);
      const memories = listMemoriesForObjective(objective.id);
      const handoffs = listHandoffsForObjective(objective.id);
      const events = listEventsForObjective(objective.id);

      const participants = Array.from(
        new Set(
          tasks
            .map((t) => t.assignedAgentId)
            .filter((id): id is string => Boolean(id)),
        ),
      ).map((id) => {
        const agent = agentMap[id];
        return agent
          ? {
              id: agent.id,
              name: agent.name,
              jobProfile: agent.jobProfile,
            }
          : { id, name: "Unknown", jobProfile: "—" };
      });

      return {
        objective,
        tasks: tasks.map((task) => ({
          ...task,
          agent: task.assignedAgentId
            ? agentMap[task.assignedAgentId]
              ? {
                  id: task.assignedAgentId,
                  name: agentMap[task.assignedAgentId].name,
                  jobProfile: agentMap[task.assignedAgentId].jobProfile,
                }
              : null
            : null,
          decisions: memories.filter(
            (m) =>
              m.relatedTaskId === task.id &&
              (m.kind === "observation" || m.tags.includes("decision")),
          ),
          learnings: memories.filter(
            (m) => m.relatedTaskId === task.id && m.kind === "lesson",
          ),
        })),
        participants,
        handoffs: handoffs.map((h) => ({
          ...h,
          from: agentMap[h.fromAgentId]
            ? {
                name: agentMap[h.fromAgentId].name,
                jobProfile: agentMap[h.fromAgentId].jobProfile,
              }
            : null,
          to: agentMap[h.toAgentId]
            ? {
                name: agentMap[h.toAgentId].name,
                jobProfile: agentMap[h.toAgentId].jobProfile,
              }
            : null,
        })),
        learnings: memories.filter((m) => m.kind === "lesson"),
        decisions: memories.filter(
          (m) => m.kind === "observation" || m.tags.includes("decision"),
        ),
        events,
      };
    });
}

/** Server-side snapshot so the dashboard is useful even before client JS runs. */
export function loadSuiteSnapshot(): SuiteSnapshot {
  ensureSuiteAwake();
  ensureBuiltinAgents();
  startWorker({ intervalMs: 2500, mode: "embedded" });

  const agents = listAgents();
  const objectives = listObjectives().map((objective) => ({
    ...objective,
    tasks: listTasks(objective.id),
  }));

  return {
    worker: getWorkerState(),
    objectives,
    agents,
    history: buildHistory(),
    skills: listSkillMetadata().map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      capability: s.capability,
    })),
  };
}
