import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { ensureBuiltinAgents } from "@/lib/suite/orchestrator";
import { listAgents, listMemories } from "@/lib/suite/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureSuiteAwake();
  ensureBuiltinAgents();
  const { searchParams } = new URL(request.url);
  const withMemory = searchParams.get("memory") === "1";
  const agents = listAgents().map((agent) => ({
    ...agent,
    memories: withMemory ? listMemories(agent.id, 12) : undefined,
  }));
  return NextResponse.json({ agents });
}
