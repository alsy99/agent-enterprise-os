import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import {
  getWorkerState,
  startWorker,
  stopWorker,
  tickOnce,
} from "@/lib/suite/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSuiteAwake();
  return NextResponse.json({ worker: getWorkerState() });
}

export async function POST(request: Request) {
  ensureSuiteAwake();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "status");

  if (action === "start") {
    return NextResponse.json({
      worker: startWorker({
        intervalMs: Number(body.intervalMs) || 2500,
        mode: "embedded",
      }),
    });
  }
  if (action === "stop") {
    return NextResponse.json({ worker: stopWorker() });
  }
  if (action === "tick") {
    const result = tickOnce();
    return NextResponse.json({ worker: getWorkerState(), result });
  }

  return NextResponse.json({ worker: getWorkerState() });
}
