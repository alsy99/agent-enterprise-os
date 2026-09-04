import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { ensureBuiltinAgents } from "@/lib/suite/orchestrator";
import {
  listAgents,
  listEventsForObjective,
  listHandoffsForObjective,
  listMemoriesForObjective,
  listObjectives,
  listTasks,
} from "@/lib/suite/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureSuiteAwake();
  ensureBuiltinAgents();

  const { searchParams } = new URL(request.url);
  const objectiveId = searchParams.get("objectiveId");
  const agents = listAgents();
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  const objectives = listObjectives()
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

  return NextResponse.json({ history: objectives });
}
