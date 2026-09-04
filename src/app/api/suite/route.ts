import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { listHandoffs, listMemories, listEvents } from "@/lib/suite/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureSuiteAwake();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "all";

  if (kind === "handoffs") {
    return NextResponse.json({ handoffs: listHandoffs(50) });
  }
  if (kind === "memories") {
    return NextResponse.json({ memories: listMemories(undefined, 80) });
  }
  if (kind === "events") {
    return NextResponse.json({ events: listEvents(100) });
  }

  return NextResponse.json({
    handoffs: listHandoffs(40),
    memories: listMemories(undefined, 60),
    events: listEvents(80),
  });
}
