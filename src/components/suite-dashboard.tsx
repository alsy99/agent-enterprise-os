"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type {
  AgentRecord,
  Objective,
  Task,
  WorkerState,
} from "@/lib/suite/types";

type ObjectiveWithTasks = Objective & { tasks: Task[] };

type Snapshot = {
  worker: WorkerState;
  objectives: ObjectiveWithTasks[];
  agents: AgentRecord[];
};

const empty: Snapshot = {
  worker: { running: false, ticks: 0, mode: "embedded" },
  objectives: [],
  agents: [],
};

type View = "board" | "agents";

function statusTone(status: string) {
  switch (status) {
    case "waiting":
    case "online":
      return "bg-lime-400/15 text-lime-300 border-lime-400/30";
    case "busy":
    case "running":
    case "assigned":
    case "queued":
      return "bg-amber-400/15 text-amber-200 border-amber-400/30";
    case "completed":
      return "bg-emerald-400/15 text-emerald-300 border-emerald-400/30";
    case "failed":
    case "blocked":
      return "bg-rose-400/15 text-rose-300 border-rose-400/30";
    case "active":
      return "bg-sky-400/15 text-sky-300 border-sky-400/30";
    default:
      return "bg-white/5 text-zinc-300 border-white/10";
  }
}

function objectiveProgress(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "completed").length;
  return Math.round((done / tasks.length) * 100);
}

function currentTask(tasks: Task[]) {
  return (
    tasks.find((t) => t.status === "running") ??
    tasks.find((t) => t.status === "queued" || t.status === "assigned") ??
    null
  );
}

export function SuiteDashboard() {
  const [data, setData] = useState<Snapshot>(empty);
  const [view, setView] = useState<View>("board");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [workerRes, objRes, agentRes] = await Promise.all([
        fetch("/api/worker", { cache: "no-store" }),
        fetch("/api/objectives", { cache: "no-store" }),
        fetch("/api/agents", { cache: "no-store" }),
      ]);
      const workerJson = await workerRes.json();
      const objJson = await objRes.json();
      const agentJson = await agentRes.json();
      setData({
        worker: workerJson.worker,
        objectives: objJson.objectives ?? [],
        agents: agentJson.agents ?? [],
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

  const agentById = useMemo(() => {
    const map = new Map<string, AgentRecord>();
    for (const a of data.agents) map.set(a.id, a);
    return map;
  }, [data.agents]);

  const ongoing = useMemo(
    () => data.objectives.filter((o) => o.status === "active"),
    [data.objectives],
  );

  const liveCount = data.agents.filter((a) =>
    ["online", "waiting", "busy", "learning"].includes(a.status),
  ).length;

  const busyAgents = data.agents.filter((a) => a.status === "busy").length;

  async function submitObjective(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority: 5 }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create objective");
      }
      setTitle("");
      setDescription("");
      setShowDispatch(false);
      setView("board");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function workerAction(action: "start" | "stop") {
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

  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,230,53,0.1),_transparent_50%),linear-gradient(165deg,#09090b,#111827_50%,#0a0f0a)]" />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-lime-300/80">
              Forever Online
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl">
              Agent Suite
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={statusTone(data.worker.running ? "waiting" : "failed")}
            >
              {data.worker.running ? "awake" : "paused"}
            </Badge>
            <span className="font-mono text-xs text-zinc-500">
              {liveCount} agents · {busyAgents} working · {ongoing.length}{" "}
              active
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                workerAction(data.worker.running ? "stop" : "start")
              }
              className="border-white/15 bg-white/5"
            >
              {data.worker.running ? "Pause" : "Wake"}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowDispatch((v) => !v)}
              className="bg-lime-400 text-zinc-950 hover:bg-lime-300"
            >
              {showDispatch ? "Close" : "New objective"}
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {showDispatch ? (
          <form
            onSubmit={submitObjective}
            className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4"
          >
            <div className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Objective title"
                required
                className="border-white/10 bg-black/30"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should the suite accomplish? Optional: [cap:docs]"
                required
                rows={3}
                className="border-white/10 bg-black/30"
              />
              <Button
                type="submit"
                disabled={busy}
                className="bg-lime-400 text-zinc-950 hover:bg-lime-300"
              >
                Queue objective
              </Button>
            </div>
          </form>
        ) : null}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "board" ? "default" : "outline"}
            onClick={() => setView("board")}
            className={
              view === "board"
                ? "bg-white text-zinc-950"
                : "border-white/15 bg-transparent"
            }
          >
            Ongoing
          </Button>
          <Button
            size="sm"
            variant={view === "agents" ? "default" : "outline"}
            onClick={() => setView("agents")}
            className={
              view === "agents"
                ? "bg-white text-zinc-950"
                : "border-white/15 bg-transparent"
            }
          >
            Agents
          </Button>
        </div>

        {view === "board" ? (
          <section className="space-y-3">
            {ongoing.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/40 px-5 py-12 text-center">
                <p className="text-zinc-300">No ongoing work</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Queue an objective to put the suite to work.
                </p>
              </div>
            ) : (
              ongoing.map((objective) => {
                const progress = objectiveProgress(objective.tasks);
                const active = currentTask(objective.tasks);
                const assignee = active?.assignedAgentId
                  ? agentById.get(active.assignedAgentId)
                  : null;
                const completed = objective.tasks.filter(
                  (t) => t.status === "completed",
                ).length;

                return (
                  <article
                    key={objective.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950/55 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-medium text-white">
                          {objective.title}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                          {objective.description.replace(/\s*\[cap:[^\]]+\]/gi, "")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusTone(objective.status)}
                      >
                        {progress}%
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
                        <span>
                          {completed}/{objective.tasks.length} tasks
                        </span>
                        <span>
                          {active
                            ? active.status === "running"
                              ? "in progress"
                              : "up next"
                            : "wrapping up"}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2 bg-white/10" />
                    </div>

                    {active ? (
                      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-3">
                        <p className="text-sm text-zinc-200">{active.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {assignee
                            ? `${assignee.name} · ${assignee.jobProfile}`
                            : `Needs ${active.requiredCapability}`}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {objective.tasks.map((task) => (
                        <Badge
                          key={task.id}
                          variant="outline"
                          className={statusTone(task.status)}
                        >
                          {task.requiredCapability}
                        </Badge>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2">
            {data.agents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-2xl border border-white/10 bg-zinc-950/55 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      {agent.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-lime-300/90">
                      {agent.jobProfile}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusTone(agent.status)}
                  >
                    {agent.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {agent.capabilities.slice(0, 4).join(" · ")}
                </p>
                <p className="mt-2 font-mono text-[11px] text-zinc-600">
                  {agent.stats.completed} done · {agent.stats.lessons} lessons
                </p>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
