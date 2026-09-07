"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api";
import type {
  ChatMessage,
  SuiteEvent,
  Task,
} from "@/lib/suite/types";
import type {
  SuiteSnapshot,
  SuiteView,
} from "@/lib/suite/snapshot";

type View = SuiteView;
type Snapshot = SuiteSnapshot;

const VIEW_IDS: View[] = ["board", "history", "agents", "skills", "talk"];

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

export function SuiteDashboard({
  initialView = "board",
  initialData,
}: {
  initialView?: View;
  initialData: Snapshot;
}) {
  const [data, setData] = useState<Snapshot>(initialData);
  const [view, setView] = useState<View>(
    VIEW_IDS.includes(initialView) ? initialView : "board",
  );
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(
    initialView === "history" ? (initialData.history[0]?.objective.id ?? null) : null,
  );
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);
  const [talkAgentId, setTalkAgentId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  // Keep local view in sync when the server re-renders with a new ?view=
  useEffect(() => {
    setView(VIEW_IDS.includes(initialView) ? initialView : "board");
  }, [initialView]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refresh = useCallback(async () => {
    try {
      const endpoints = [
        "/api/worker",
        "/api/objectives",
        "/api/agents",
        "/api/history",
        "/api/skills",
      ] as const;
      const responses = await Promise.all(
        endpoints.map((path) => apiFetch(path)),
      );
      const bodies = await Promise.all(
        responses.map(async (res, i) => {
          if (!res.ok) throw new Error(`${endpoints[i]} → ${res.status}`);
          return res.json();
        }),
      );
      const [workerJson, objJson, agentJson, historyJson, skillsJson] = bodies;
      setData({
        worker: workerJson.worker ?? initialData.worker,
        objectives: objJson.objectives ?? [],
        agents: agentJson.agents ?? [],
        history: historyJson.history ?? [],
        skills: skillsJson.skills ?? [],
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suite");
    }
  }, [initialData.worker]);

  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (view !== "history") return;
    if (openHistoryId) return;
    const first = data.history[0]?.objective.id;
    if (first) setOpenHistoryId(first);
  }, [view, data.history, openHistoryId]);

  const agentById = useMemo(() => {
    const map = new Map<string, (typeof data.agents)[number]>();
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
      const res = await apiFetch("/api/objectives", {
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
      await apiFetch("/api/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const talkAgent = useMemo(
    () => data.agents.find((a) => a.id === talkAgentId) ?? null,
    [data.agents, talkAgentId],
  );

  useEffect(() => {
    if (!talkAgentId || view !== "talk") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/chat?agentId=${talkAgentId}`);
        const json = await res.json();
        if (!cancelled) setChatMessages(json.messages ?? []);
      } catch {
        /* ignore transient */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [talkAgentId, view]);

  function openTalk(agentId: string) {
    setTalkAgentId(agentId);
    window.location.assign(`/talk?agent=${encodeURIComponent(agentId)}`);
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!talkAgentId || !chatDraft.trim() || chatBusy) return;
    setChatBusy(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: talkAgentId, message: chatDraft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Chat failed");
      setChatMessages(json.messages ?? []);
      setChatDraft("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }

  const tabs: Array<{ id: View; label: string; href: string }> = [
    { id: "board", label: "Ongoing", href: "/" },
    { id: "history", label: "History", href: "/history" },
    { id: "agents", label: "Agents", href: "/agents" },
    { id: "talk", label: "Talk", href: "/talk" },
    { id: "skills", label: "Skills", href: "/skills" },
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
              (orchestrator-workers). Try “introduce all the agents”.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && task.trim()) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
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

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Suite views">
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={active}
                onClick={(e) => {
                  // Force a full document load — Next soft-nav was reusing this
                  // client tree and leaving Safari stuck on Ongoing / empty state.
                  e.preventDefault();
                  window.location.assign(tab.href);
                }}
                className={
                  active
                    ? "inline-flex h-7 items-center rounded-lg bg-white px-2.5 text-[0.8rem] font-medium text-zinc-950"
                    : "inline-flex h-7 items-center rounded-lg border border-white/15 bg-transparent px-2.5 text-[0.8rem] font-medium text-zinc-200 hover:bg-white/5"
                }
              >
                {tab.label}
                {tab.id === "history" && data.history.length > 0
                  ? ` (${data.history.length})`
                  : ""}
              </a>
            );
          })}
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

                        {(() => {
                          const outputTask =
                            item.tasks.find((t) =>
                              t.title.toLowerCase().includes("nova answers"),
                            ) ??
                            [...item.tasks]
                              .reverse()
                              .find(
                                (t) =>
                                  t.result &&
                                  t.requiredCapability !== "learn" &&
                                  t.status === "completed",
                              ) ??
                            item.tasks.find((t) => t.result);
                          if (!outputTask?.result) return null;
                          return (
                            <div className="rounded-xl border border-lime-400/25 bg-lime-400/5 p-4">
                              <h3 className="font-mono text-sm uppercase tracking-wider text-lime-300">
                                Output
                              </h3>
                              <p className="mt-1 text-sm text-zinc-400">
                                {outputTask.agent
                                  ? `${outputTask.agent.name} · ${outputTask.agent.jobProfile}`
                                  : "Suite"}
                              </p>
                              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 font-sans text-base leading-relaxed text-zinc-100 soft-scroll">
                                {outputTask.result}
                              </pre>
                            </div>
                          );
                        })()}

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
                        <p className="mt-1 text-sm text-zinc-400">
                          {agent.personality?.archetype ?? "Suite agent"} ·{" "}
                          {(agent.personality?.traits ?? []).slice(0, 3).join(", ")}
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
                    <p className="mt-2 text-sm text-zinc-500">
                      Skill-driven suite agent (deterministic runtime)
                    </p>
                  </button>

                  {open ? (
                    <div className="space-y-3 border-t border-white/10 px-4 py-3">
                      <Button
                        size="sm"
                        className="bg-lime-400 text-zinc-950 hover:bg-lime-300"
                        onClick={() => openTalk(agent.id)}
                      >
                        Talk with {agent.name}
                      </Button>
                      <div>
                        <p className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                          Character
                        </p>
                        <p className="mt-2 text-base text-zinc-300">
                          {agent.personality?.voice}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500">
                          Quirk: {agent.personality?.quirk}
                        </p>
                        <p className="mt-2 text-sm italic text-zinc-400">
                          “{agent.personality?.greeting}”
                        </p>
                      </div>
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

        {view === "talk" ? (
          <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-2">
              <p className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                Pick an agent
              </p>
              {data.agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => openTalk(agent.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    talkAgentId === agent.id
                      ? "border-lime-400/40 bg-lime-400/10"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-white">{agent.name}</p>
                  <p className="text-sm text-lime-300">{agent.jobProfile}</p>
                  <p className="text-xs text-zinc-500">
                    {agent.personality?.archetype}
                  </p>
                </button>
              ))}
            </aside>

            <div className="flex min-h-[28rem] flex-col rounded-2xl border border-white/10 bg-zinc-950/55">
              {talkAgent ? (
                <>
                  <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-xl font-medium text-white">
                      {talkAgent.name}
                    </h2>
                    <p className="text-base text-zinc-400">
                      {talkAgent.jobProfile} ·{" "}
                      {talkAgent.personality?.archetype} · ask for status, or{" "}
                      <span className="text-zinc-300">assign: your task</span>
                    </p>
                  </div>

                  <div className="flex-1 space-y-3 overflow-auto p-4 soft-scroll">
                    {chatMessages.length === 0 ? (
                      <p className="text-base text-zinc-500">
                        No messages yet. Try “what’s your status?” or “assign:
                        draft a short security note”.
                      </p>
                    ) : (
                      chatMessages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl px-3 py-2 ${
                            m.role === "user"
                              ? "ml-8 bg-lime-400/15 text-zinc-100"
                              : "mr-8 bg-black/35 text-zinc-200"
                          }`}
                        >
                          <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                            {m.role === "user" ? "You" : talkAgent.name}
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap font-sans text-base leading-relaxed">
                            {m.content}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={sendChat}
                    className="border-t border-white/10 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Textarea
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendChat();
                          }
                        }}
                        rows={2}
                        placeholder={`Message ${talkAgent.name}…`}
                        className="min-h-[64px] flex-1 border-white/10 bg-black/30 text-base"
                      />
                      <Button
                        type="submit"
                        disabled={chatBusy || !chatDraft.trim()}
                        className="bg-lime-400 text-zinc-950 hover:bg-lime-300"
                      >
                        Send
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
                  Select an agent to talk with for updates or direct assignments.
                </div>
              )}
            </div>
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
