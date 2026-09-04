import { ensureBuiltinAgents } from "./orchestrator";
import { listAgents, listObjectives } from "./store";
import { wakeFromPersistedState } from "./worker";

let booted = false;

export function bootstrapSuite() {
  if (booted) return;
  booted = true;
  ensureBuiltinAgents();
  wakeFromPersistedState();
}

export function getSuiteSnapshot() {
  bootstrapSuite();
  return {
    agents: listAgents(),
    objectives: listObjectives(),
  };
}
