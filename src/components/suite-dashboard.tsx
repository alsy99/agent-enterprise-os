"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  AgentRecord,
  Handoff,
  MemoryEntry,
  Objective,
  SuiteEvent,
  Task,
  WorkerState,
} from "@/lib/suite/types";

type ObjectiveWithTasks = Objective & { tasks: Task[] };

type Snapshot = {
  worker: WorkerState;
  objectives: ObjectiveWithTasks[];
  agents: AgentRecord[];
  handoffs: Handoff[];
  memories: MemoryEntry[];
  events: SuiteEvent[];
};

const empty: Snapshot = {
  worker: { running: false, ticks: 0, mode: "embedded" },
  objectives: [],
  agents: [],
  handoffs: [],
  memories: [],
  events: [],
};

function statusTone(status: string) {
  switch (status) {
    case "waiting":
    case "online":
      return "bg-lime-400/15 text-lime-300 border-lime-400/30";
    case "busy":
    case "running":
    case "assigned":
      return "bg-amber-400/15 text-amber-200 border-amber-400/30";
    case "completed":
    case "success":
      return "bg-emerald-400/15 text-emerald-300 border-emerald-400/30";
    case "failed":
    case "blocked":
    case "error":
      return "bg-rose-400/15 text-rose-300 border-rose-400/30";
    case "active":
      return "bg-sky-400/15 text-sky-300 border-sky-400/30";
    default:
      return "bg-white/5 text-zinc-300 border-white/10";
  }
}

export function SuiteDashboard() {
  const [data, setData] = useState<Snapshot>(empty);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [workerRes, objRes, agentRes, suiteRes] = await Promise.all([
        fetch("/api/worker", { cache: "no-store" }),
        fetch("/api/objectives", { cache: "no-store" }),
        fetch("/api/agents?memory=1", { cache: "no-store" }),
        fetch("/api/suite", { cache: "no-store" }),
      ]);
      const workerJson = await workerRes.json();
      const objJson = await objRes.json();
      const agentJson = await agentRes.json();
      const suiteJson = await suiteRes.json();
      setData({
        worker: workerJson.worker,
        objectives: objJson.objectives ?? [],
        agents: agentJson.agents ?? [],
        handoffs: suiteJson.handoffs ?? [],
        memories: suiteJson.memories ?? [],
        events: suiteJson.events ?? [],
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suite");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const selectedAgent = useMemo(
    () => data.agents.find((a) => a.id === selectedAgentId) ?? data.agents[0],
    [data.agents, selectedAgentId],
  );

  async function submitObjective(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority: Number(priority) || 5,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create objective");
      }
      setTitle("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function workerAction(action: "start" | "stop" | "tick") {
    setBusy(true);
    try {
      await fetch("/api/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const onlineCount = data.agents.filter((a) =>
    ["online", "waiting", "busy", "learning"].includes(a.status),
  ).length;

  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,230,53,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.1),_transparent_45%),linear-gradient(160deg,#09090b_0%,#111827_45%,#0a0f0a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-lime-300/80">
              Forever Online
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight text-white sm:text-5xl">
              Agent Suite
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Self-learning agents stay awake, wait their turn, and persist
              context for handoffs. The orchestrator spawns specialists when a
              capability does not exist yet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={statusTone(data.worker.running ? "waiting" : "failed")}
            >
              worker {data.worker.running ? "awake" : "stopped"}
            </Badge>
            <Badge variant="outline" className={statusTone("online")}>
              {onlineCount}/{data.agents.length} agents live
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 font-mono text-zinc-300">
              ticks {data.worker.ticks}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => workerAction(data.worker.running ? "stop" : "start")}
              className="border-lime-400/30 bg-lime-400/10 text-lime-200 hover:bg-lime-400/20"
            >
              {data.worker.running ? "Pause worker" : "Wake worker"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => workerAction("tick")}
              className="border-white/15 bg-white/5"
            >
              Force tick
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={submitObjective}
            className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Dispatch objective
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Tip: add{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-lime-300">
                [cap:security]
              </code>{" "}
              to force the orchestrator to spawn a new specialist type.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Objective title"
                required
                className="border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should the suite accomplish?"
                required
                rows={4}
                className="border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="border-white/10 bg-black/30 sm:w-28"
                  aria-label="Priority"
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-lime-400 text-zinc-950 hover:bg-lime-300"
                >
                  Queue for forever agents
                </Button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Live event stream
            </h2>
            <ScrollArea className="mt-4 h-64">
              <div className="space-y-3 pr-3">
                {data.events.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Waiting for the first heartbeat…
                  </p>
                ) : (
                  data.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={statusTone(event.level)}
                        >
                          {event.level}
                        </Badge>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formatDistanceToNow(new Date(event.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-zinc-300">
                        {event.source}
                      </p>
                      <p className="text-sm text-zinc-400">{event.message}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
                Agents
              </h2>
              <span className="font-mono text-xs text-zinc-500">
                always waiting their turn
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedAgent?.id === agent.id
                      ? "border-lime-400/40 bg-lime-400/10"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-100">{agent.name}</p>
                    <Badge variant="outline" className={statusTone(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-zinc-500">
                    {agent.type}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                    {agent.capabilities.join(" · ")}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-zinc-500">
                    done {agent.stats.completed} · fail {agent.stats.failed} ·
                    lessons {agent.stats.lessons}
                  </p>
                </button>
              ))}
            </div>

            {selectedAgent ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
                <h3 className="text-sm font-medium text-lime-300">
                  {selectedAgent.name} rules & learning
                </h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      Rules
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                      {selectedAgent.rules.map((rule) => (
                        <li key={rule}>• {rule}</li>
                      ))}
                    </ul>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      Guardrails
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                      {selectedAgent.guardrails.map((g) => (
                        <li key={g.id}>
                          • [{g.severity}] {g.rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      Playbook
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                      {selectedAgent.playbook.length === 0 ? (
                        <li className="text-zinc-500">No lessons yet</li>
                      ) : (
                        selectedAgent.playbook.slice(0, 8).map((p) => (
                          <li key={p}>• {p}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Objectives & tasks
            </h2>
            <ScrollArea className="mt-4 h-[34rem]">
              <div className="space-y-4 pr-3">
                {data.objectives.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No objectives yet. Dispatch one to wake the pipeline.
                  </p>
                ) : (
                  data.objectives.map((objective) => (
                    <div
                      key={objective.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium text-zinc-100">
                          {objective.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={statusTone(objective.status)}
                          >
                            {objective.status}
                          </Badge>
                          <span className="font-mono text-[11px] text-zinc-500">
                            P{objective.priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {objective.description}
                      </p>
                      <Separator className="my-3 bg-white/10" />
                      <div className="space-y-2">
                        {objective.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border border-white/8 bg-zinc-950/50 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm text-zinc-200">{task.title}</p>
                              <Badge
                                variant="outline"
                                className={statusTone(task.status)}
                              >
                                {task.status}
                              </Badge>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-zinc-500">
                              needs:{task.requiredCapability}
                              {task.assignedAgentId
                                ? ` · agent:${task.assignedAgentId.slice(0, 8)}`
                                : ""}
                            </p>
                            {task.result ? (
                              <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 font-mono text-[11px] text-zinc-400">
                                {task.result}
                              </pre>
                            ) : null}
                            {task.error ? (
                              <p className="mt-2 text-xs text-rose-300">
                                {task.error}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Handoffs
            </h2>
            <ScrollArea className="mt-4 h-64">
              <div className="space-y-3 pr-3">
                {data.handoffs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No handoffs yet.</p>
                ) : (
                  data.handoffs.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={statusTone(h.status)}>
                          {h.status}
                        </Badge>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formatDistanceToNow(new Date(h.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-300">{h.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
              Persistent memory
            </h2>
            <ScrollArea className="mt-4 h-64">
              <div className="space-y-3 pr-3">
                {data.memories.length === 0 ? (
                  <p className="text-sm text-zinc-500">Memory bank empty.</p>
                ) : (
                  data.memories.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="border-sky-400/30 bg-sky-400/10 text-sky-200"
                        >
                          {m.kind}
                        </Badge>
                        <span className="font-mono text-[11px] text-zinc-500">
                          imp {m.importance.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-sm text-zinc-300">
                        {m.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </section>
      </main>
    </div>
  );
}
