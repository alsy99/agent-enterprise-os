import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { submitObjective, ensureBuiltinAgents } from "@/lib/suite/orchestrator";
import { listObjectives, listTasks } from "@/lib/suite/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSuiteAwake();
  ensureBuiltinAgents();
  const objectives = listObjectives().map((o) => ({
    ...o,
    tasks: listTasks(o.id),
  }));
  return NextResponse.json({ objectives });
}

export async function POST(request: Request) {
  ensureSuiteAwake();
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const priority = Number(body.priority ?? 5);

  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 },
    );
  }

  const objective = submitObjective({
    title,
    description,
    priority: Number.isFinite(priority) ? priority : 5,
  });

  return NextResponse.json({
    objective,
    tasks: listTasks(objective.id),
  });
}
