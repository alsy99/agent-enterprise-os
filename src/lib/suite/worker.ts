import {
  emitEvent,
  getWorkerMeta,
  setWorkerMeta,
} from "./store";
import { ensureBuiltinAgents, orchestrateTick } from "./orchestrator";
import type { WorkerState } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __agentSuiteWorker:
    | {
        timer?: NodeJS.Timeout;
        running: boolean;
        startedAt?: string;
        lastTickAt?: string;
        ticks: number;
        mode: "local" | "embedded";
      }
    | undefined;
}

function state(): NonNullable<typeof globalThis.__agentSuiteWorker> {
  if (!globalThis.__agentSuiteWorker) {
    globalThis.__agentSuiteWorker = {
      running: false,
      ticks: 0,
      mode: "embedded",
    };
  }
  return globalThis.__agentSuiteWorker;
}

export function getWorkerState(): WorkerState {
  const s = state();
  return {
    running: s.running,
    startedAt: s.startedAt,
    lastTickAt: s.lastTickAt,
    ticks: s.ticks,
    mode: s.mode,
  };
}

export function tickOnce() {
  ensureBuiltinAgents();
  const result = orchestrateTick();
  const s = state();
  s.ticks += 1;
  s.lastTickAt = new Date().toISOString();
  setWorkerMeta("lastTickAt", s.lastTickAt);
  setWorkerMeta("ticks", String(s.ticks));
  emitEvent(
    "info",
    "worker",
    `Tick #${s.ticks}: processed=${result.processed}, spawned=${result.spawned}, heartbeats=${result.heartbeats}`,
    result,
  );
  return result;
}

export function startWorker(options?: {
  intervalMs?: number;
  mode?: "local" | "embedded";
}) {
  const s = state();
  if (s.running) return getWorkerState();

  const intervalMs = options?.intervalMs ?? 2500;
  s.running = true;
  s.mode = options?.mode ?? "embedded";
  s.startedAt = new Date().toISOString();
  setWorkerMeta("running", "true");
  setWorkerMeta("startedAt", s.startedAt);
  setWorkerMeta("mode", s.mode);

  ensureBuiltinAgents();
  emitEvent(
    "success",
    "worker",
    `Suite worker awake (${s.mode}) — agents forever online`,
    { intervalMs },
  );

  // Immediate first tick on wake
  tickOnce();

  s.timer = setInterval(() => {
    try {
      tickOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : "tick failed";
      emitEvent("error", "worker", message);
    }
  }, intervalMs);

  // Prevent timer from keeping process semantics weird in Next; unref when available
  if (typeof s.timer.unref === "function") {
    s.timer.unref();
  }

  return getWorkerState();
}

export function stopWorker() {
  const s = state();
  if (s.timer) clearInterval(s.timer);
  s.timer = undefined;
  s.running = false;
  setWorkerMeta("running", "false");
  emitEvent("warn", "worker", "Suite worker stopped");
  return getWorkerState();
}

export function wakeFromPersistedState() {
  const running = getWorkerMeta("running");
  if (running === "true" && !state().running) {
    startWorker({ mode: "embedded" });
  } else if (!state().running) {
    // Default: wake on system/process start
    startWorker({ mode: "embedded" });
  }
  return getWorkerState();
}
