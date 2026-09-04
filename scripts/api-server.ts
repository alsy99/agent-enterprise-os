/**
 * Standalone Agent Suite API for Cursor Cloud (and any always-on host).
 *   npm run api
 *
 * Port defaults to 43124. Pair with a tunnel for public access from GitHub Pages.
 */
import http from "http";
import { URL } from "url";
import { ensureBuiltinAgents } from "../src/lib/suite/orchestrator";
import { submitTaskBrief, submitObjective } from "../src/lib/suite/orchestrator";
import { chatWithAgent, getAgentChat } from "../src/lib/suite/chat";
import {
  listAgents,
  listMemories,
  listObjectives,
  listTasks,
  listEvents,
  listHandoffs,
  listMemoriesForObjective,
  listHandoffsForObjective,
  listEventsForObjective,
} from "../src/lib/suite/store";
import { listSkillMetadata, loadSkill } from "../src/lib/suite/skills";
import {
  getWorkerState,
  startWorker,
  stopWorker,
  tickOnce,
  wakeFromPersistedState,
} from "../src/lib/suite/worker";
import { ensureSuiteAwake } from "../src/lib/suite";

const PORT = Number(process.env.PORT || process.env.API_PORT || 43124);
const HOST = process.env.HOST || "0.0.0.0";

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  cors(res);
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function historyPayload(objectiveId?: string | null) {
  ensureBuiltinAgents();
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
  return { history: objectives };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    ensureSuiteAwake();
    ensureBuiltinAgents();

    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/api/health" || path === "/health") {
      return send(res, 200, {
        ok: true,
        service: "agent-suite-api",
        worker: getWorkerState(),
      });
    }

    if (path === "/api/worker" && req.method === "GET") {
      return send(res, 200, { worker: getWorkerState() });
    }
    if (path === "/api/worker" && req.method === "POST") {
      const body = (await readJson(req)) as { action?: string; intervalMs?: number };
      const action = String(body.action ?? "status");
      if (action === "start") {
        return send(res, 200, {
          worker: startWorker({
            intervalMs: Number(body.intervalMs) || 2500,
            mode: "local",
          }),
        });
      }
      if (action === "stop") return send(res, 200, { worker: stopWorker() });
      if (action === "tick") {
        const result = tickOnce();
        return send(res, 200, { worker: getWorkerState(), result });
      }
      return send(res, 200, { worker: getWorkerState() });
    }

    if (path === "/api/objectives" && req.method === "GET") {
      const objectives = listObjectives().map((o) => ({
        ...o,
        tasks: listTasks(o.id),
      }));
      return send(res, 200, { objectives });
    }
    if (path === "/api/objectives" && req.method === "POST") {
      const body = (await readJson(req)) as Record<string, unknown>;
      const brief = String(body.task ?? body.brief ?? body.goal ?? "").trim();
      if (brief) {
        const objective = submitTaskBrief(brief);
        return send(res, 200, {
          objective,
          tasks: listTasks(objective.id),
        });
      }
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      if (title && description) {
        const objective = submitObjective({
          title,
          description,
          priority: Number(body.priority ?? 5),
        });
        return send(res, 200, {
          objective,
          tasks: listTasks(objective.id),
        });
      }
      return send(res, 400, { error: "task is required" });
    }

    if (path === "/api/agents" && req.method === "GET") {
      const withMemory = url.searchParams.get("memory") === "1";
      const agents = listAgents().map((agent) => ({
        ...agent,
        memories: withMemory ? listMemories(agent.id, 12) : undefined,
      }));
      return send(res, 200, { agents });
    }

    if (path === "/api/suite" && req.method === "GET") {
      const kind = url.searchParams.get("kind") ?? "all";
      if (kind === "handoffs") return send(res, 200, { handoffs: listHandoffs(50) });
      if (kind === "memories") return send(res, 200, { memories: listMemories(undefined, 80) });
      if (kind === "events") return send(res, 200, { events: listEvents(100) });
      return send(res, 200, {
        handoffs: listHandoffs(40),
        memories: listMemories(undefined, 60),
        events: listEvents(80),
      });
    }

    if (path === "/api/history" && req.method === "GET") {
      return send(res, 200, historyPayload(url.searchParams.get("objectiveId")));
    }

    if (path === "/api/skills" && req.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const skill = loadSkill(id);
        if (!skill) return send(res, 404, { error: "skill not found" });
        return send(res, 200, { skill });
      }
      return send(res, 200, {
        skills: listSkillMetadata(),
        guidelines: {
          agents:
            "https://www.anthropic.com/engineering/building-effective-agents",
          skills:
            "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview",
          principles: [
            "Maintain simplicity in agent design",
            "Prioritize transparency by showing planning steps",
            "Craft clear agent-computer interfaces (skills + tools)",
            "Progressive disclosure: metadata always, instructions on trigger",
            "Prefer orchestrator-workers when subtasks depend on the brief",
          ],
        },
      });
    }

    if (path === "/api/chat" && req.method === "GET") {
      const agentId = url.searchParams.get("agentId");
      if (!agentId) {
        return send(res, 200, {
          agents: listAgents().map((a) => ({
            id: a.id,
            name: a.name,
            jobProfile: a.jobProfile,
            status: a.status,
          })),
        });
      }
      try {
        return send(res, 200, getAgentChat(agentId));
      } catch (error) {
        return send(res, 404, {
          error: error instanceof Error ? error.message : "Not found",
        });
      }
    }
    if (path === "/api/chat" && req.method === "POST") {
      const body = (await readJson(req)) as { agentId?: string; message?: string };
      const agentId = String(body.agentId ?? "").trim();
      const message = String(body.message ?? "").trim();
      if (!agentId || !message) {
        return send(res, 400, { error: "agentId and message are required" });
      }
      try {
        return send(res, 200, chatWithAgent(agentId, message));
      } catch (error) {
        return send(res, 400, {
          error: error instanceof Error ? error.message : "Chat failed",
        });
      }
    }

    return send(res, 404, { error: "not found", path });
  } catch (error) {
    return send(res, 500, {
      error: error instanceof Error ? error.message : "server error",
    });
  }
});

ensureBuiltinAgents();
wakeFromPersistedState();
startWorker({ intervalMs: 2500, mode: "local" });

server.listen(PORT, HOST, () => {
  console.log(`[agent-suite-api] listening on http://${HOST}:${PORT}`);
  console.log(`[agent-suite-api] health: http://${HOST}:${PORT}/api/health`);
});
