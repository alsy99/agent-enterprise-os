"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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

type HistoryTask = Task & {
  agent: { id: string; name: string; jobProfile: string } | null;
  decisions: MemoryEntry[];
  learnings: MemoryEntry[];
};

type HistoryItem = {
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

type SkillMeta = {
  id: string;
  name: string;
  description: string;
  capability: string;
};

type Snapshot = {
  worker: WorkerState;
  objectives: ObjectiveWithTasks[];
  agents: AgentRecord[];
  history: HistoryItem[];
  skills: SkillMeta[];
};

const empty: Snapshot = {
  worker: { running: false, ticks: 0, mode: "embedded" },
  objectives: [],
  agents: [],
  history: [],
  skills: [],
};

type View = "board" | "history" | "agents" | "skills";

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

function cleanBrief(text: string) {
  return text.replace(/\s*\[cap:[^\]]+\]/gi, "");
}

export function SuiteDashboard() {
  const [data, setData] = useState<Snapshot>(empty);
  const [view, setView] = useState<View>("board");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [workerRes, objRes, agentRes, historyRes, skillsRes] =
        await Promise.all([
          fetch("/api/worker", { cache: "no-store" }),
          fetch("/api/objectives", { cache: "no-store" }),
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/history", { cache: "no-store" }),
          fetch("/api/skills", { cache: "no-store" }),
        ]);
      const workerJson = await workerRes.json();
      const objJson = await objRes.json();
      const agentJson = await agentRes.json();
      const historyJson = await historyRes.json();
      const skillsJson = await skillsRes.json();
      setData({
        worker: workerJson.worker,
        objectives: objJson.objectives ?? [],
        agents: agentJson.agents ?? [],
        history: historyJson.history ?? [],
        skills: skillsJson.skills ?? [],
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
        body: JSON.stringify({ task }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create objective");
      }
      setTask("");
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

  const tabs: Array<{ id: View; label: string }> = [
    { id: "board", label: "Ongoing" },
    { id: "history", label: "History" },
    { id: "agents", label: "Agents" },
    { id: "skills", label: "Skills" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,230,53,0.1),_transparent_50%),linear-gradient(165deg,#09090b,#111827_50%,#0a0f0a)]" />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-300">
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
            <span className="font-mono text-base text-zinc-300">
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
            <p className="mb-3 text-base text-zinc-300">
              Tell Nova what to do — she matches Skills and assigns the team
              (orchestrator-workers).
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g. Draft a launch checklist with a security pass"
                required
                rows={2}
                className="min-h-[72px] flex-1 border-white/10 bg-black/30 text-base text-zinc-100 placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                disabled={busy || !task.trim()}
                className="bg-lime-400 text-zinc-950 hover:bg-lime-300 sm:self-stretch"
              >
                Send to Nova
              </Button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={view === tab.id ? "default" : "outline"}
              onClick={() => setView(tab.id)}
              className={
                view === tab.id
                  ? "bg-white text-zinc-950"
                  : "border-white/15 bg-transparent"
              }
            >
              {tab.label}
              {tab.id === "history" && data.history.length > 0
                ? ` (${data.history.length})`
                : ""}
            </Button>
          ))}
        </div>

        {view === "board" ? (
          <section className="space-y-3">
            {ongoing.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/40 px-5 py-12 text-center">
                <p className="text-zinc-300">No ongoing work</p>
                <p className="mt-1 text-base text-zinc-400">
                  Queue an objective, or open History for completed work.
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
                        <h2 className="text-xl font-medium text-white">
                          {objective.title}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-base text-zinc-300">
                          {cleanBrief(objective.description)}
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
                      <div className="flex items-center justify-between font-mono text-base text-zinc-300">
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
                        <p className="text-base text-zinc-100">{active.title}</p>
                        <p className="mt-1 text-base text-zinc-300">
                          {assignee
                            ? `${assignee.name} · ${assignee.jobProfile}`
                            : `Needs ${active.requiredCapability}`}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {objective.tasks.map((t) => (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className={statusTone(t.status)}
                        >
                          {t.requiredCapability}
                        </Badge>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : null}

        {view === "history" ? (
          <section className="space-y-3">
            {data.history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/40 px-5 py-12 text-center">
                <p className="text-zinc-300">No completed objectives yet</p>
              </div>
            ) : (
              data.history.map((item) => {
                const open = openHistoryId === item.objective.id;
                return (
                  <article
                    key={item.objective.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950/55"
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-5 text-left"
                      onClick={() =>
                        setOpenHistoryId(open ? null : item.objective.id)
                      }
                    >
                      <div>
                        <h2 className="text-xl font-medium text-white">
                          {item.objective.title}
                        </h2>
                        <p className="mt-1 text-base text-zinc-400">
                          {item.participants
                            .map((p) => `${p.name} (${p.jobProfile})`)
                            .join(" · ") || "No agents recorded"}
                        </p>
                        <p className="mt-2 font-mono text-base text-zinc-300">
                          {item.tasks.filter((t) => t.status === "completed").length}{" "}
                          tasks · {item.learnings.length} lessons
                          {item.objective.completedAt
                            ? ` · ${formatDistanceToNow(new Date(item.objective.completedAt), { addSuffix: true })}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusTone(item.objective.status)}
                      >
                        {item.objective.status}
                      </Badge>
                    </button>

                    {open ? (
                      <div className="space-y-4 border-t border-white/10 px-5 py-4">
                        <p className="text-base text-zinc-300">
                          {cleanBrief(item.objective.description)}
                        </p>

                        <div>
                          <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                            Tasks & agents
                          </h3>
                          <div className="mt-2 space-y-2">
                            {item.tasks.map((t) => (
                              <div
                                key={t.id}
                                className="rounded-xl border border-white/8 bg-black/25 px-3 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-base text-zinc-100">
                                    {t.title}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={statusTone(t.status)}
                                  >
                                    {t.status}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-base text-lime-300">
                                  {t.agent
                                    ? `${t.agent.name} · ${t.agent.jobProfile}`
                                    : "Unassigned"}
                                </p>

                                {t.decisions[0] ? (
                                  <p className="mt-2 text-base text-zinc-300">
                                    <span className="font-medium text-zinc-200">Why: </span>
                                    {t.decisions[0].content}
                                  </p>
                                ) : null}

                                {t.learnings[0] ? (
                                  <p className="mt-1 text-base text-zinc-300">
                                    <span className="font-medium text-zinc-200">
                                      Learned:{" "}
                                    </span>
                                    {t.learnings[0].content}
                                  </p>
                                ) : null}

                                {t.result ? (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-sm text-zinc-400">
                                      Deliverable
                                    </summary>
                                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 font-mono text-sm leading-relaxed text-zinc-300 soft-scroll">
                                      {t.result}
                                    </pre>
                                  </details>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>

                        {item.handoffs.length > 0 ? (
                          <div>
                            <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                              Handoffs
                            </h3>
                            <ul className="mt-2 space-y-1 text-base text-zinc-300">
                              {item.handoffs.map((h) => (
                                <li key={h.id}>
                                  {h.from?.name ?? "?"} → {h.to?.name ?? "?"} —{" "}
                                  {h.summary}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {item.learnings.length > 0 ? (
                          <div>
                            <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                              Lessons from this run
                            </h3>
                            <ul className="mt-2 space-y-1 text-base text-zinc-300">
                              {item.learnings.map((l) => (
                                <li key={l.id}>• {l.content}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        ) : null}

        {view === "agents" ? (
          <section className="grid items-start gap-3 sm:grid-cols-2">
            {data.agents.map((agent) => {
              const open = openAgentId === agent.id;
              return (
                <article
                  key={agent.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950/55"
                >
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => setOpenAgentId(open ? null : agent.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-medium text-white">
                          {agent.name}
                        </h2>
                        <p className="mt-1 text-base text-lime-300">
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
                    <p className="mt-3 text-sm text-zinc-400">
                      {agent.capabilities.slice(0, 4).join(" · ")}
                    </p>
                    <p className="mt-2 font-mono text-base text-zinc-300">
                      {agent.stats.completed} done · {agent.stats.lessons}{" "}
                      lessons
                    </p>
                  </button>

                  {open ? (
                    <div className="space-y-3 border-t border-white/10 px-4 py-3">
                      <div>
                        <p className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                          Playbook / learning
                        </p>
                        <ul className="mt-2 space-y-2 text-base text-zinc-300">
                          {agent.playbook.length === 0 ? (
                            <li>No lessons yet</li>
                          ) : (
                            agent.playbook.slice(0, 6).map((p) => (
                              <li key={p}>• {p}</li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                          Guardrails
                        </p>
                        <ul className="mt-2 space-y-2 text-base text-zinc-300">
                          {agent.guardrails.slice(0, 3).map((g) => (
                            <li key={g.id}>
                              • [{g.severity}] {g.rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}

        {view === "skills" ? (
          <section className="space-y-3">
            <p className="text-base text-zinc-400">
              Filesystem Skills with progressive disclosure — Nova sees names +
              descriptions at plan time; full instructions load only when a step
              runs.
            </p>
            {data.skills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center text-zinc-400">
                No skills found in /skills
              </div>
            ) : (
              data.skills.map((skill) => (
                <article
                  key={skill.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950/55 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-medium text-white">
                      {skill.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="border-sky-400/30 bg-sky-400/10 text-sky-200"
                    >
                      {skill.capability}
                    </Badge>
                  </div>
                  <p className="mt-3 text-base leading-relaxed text-zinc-300">
                    {skill.description}
                  </p>
                </article>
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
