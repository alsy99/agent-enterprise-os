/**
 * Standalone forever-running worker.
 *   npm run worker
 *
 * Wire this to systemd/launchd/pm2 to wake whenever the machine is on.
 */
import { ensureBuiltinAgents } from "../src/lib/suite/orchestrator";
import { emitEvent } from "../src/lib/suite/store";
import { getWorkerState, startWorker } from "../src/lib/suite/worker";

ensureBuiltinAgents();
startWorker({ intervalMs: 2000, mode: "local" });
emitEvent(
  "success",
  "worker-cli",
  "Standalone suite worker started — forever online until process exit",
);

console.log("[agent-suite] worker running", getWorkerState());
console.log("[agent-suite] persisting to ./data/suite.db");
console.log("[agent-suite] press Ctrl+C to stop");

setInterval(() => {
  const s = getWorkerState();
  process.stdout.write(
    `\r[agent-suite] ticks=${s.ticks} last=${s.lastTickAt ?? "-"}   `,
  );
}, 5000);
