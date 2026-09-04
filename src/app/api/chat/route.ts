import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { ensureBuiltinAgents } from "@/lib/suite/orchestrator";
import { chatWithAgent, getAgentChat } from "@/lib/suite/chat";
import { listAgents } from "@/lib/suite/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureSuiteAwake();
  ensureBuiltinAgents();
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({
      agents: listAgents().map((a) => ({
        id: a.id,
        name: a.name,
        jobProfile: a.jobProfile,
        status: a.status,
      })),
    });
  }

  try {
    const chat = getAgentChat(agentId);
    return NextResponse.json(chat);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not found" },
      { status: 404 },
    );
  }
}

export async function POST(request: Request) {
  ensureSuiteAwake();
  ensureBuiltinAgents();
  const body = await request.json();
  const agentId = String(body.agentId ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!agentId || !message) {
    return NextResponse.json(
      { error: "agentId and message are required" },
      { status: 400 },
    );
  }

  try {
    const result = chatWithAgent(agentId, message);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 400 },
    );
  }
}
