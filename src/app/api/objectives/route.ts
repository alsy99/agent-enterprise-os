import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import {
  ensureBuiltinAgents,
  submitObjective,
  submitTaskBrief,
} from "@/lib/suite/orchestrator";
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

  const brief = String(body.task ?? body.brief ?? body.goal ?? "")
    .trim();

  if (brief) {
    const objective = submitTaskBrief(brief);
    return NextResponse.json({
      objective,
      tasks: listTasks(objective.id),
    });
  }

  // Legacy dual-field support
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (title && description) {
    const objective = submitObjective({
      title,
      description,
      priority: Number(body.priority ?? 5),
    });
    return NextResponse.json({
      objective,
      tasks: listTasks(objective.id),
    });
  }

  return NextResponse.json(
    { error: "task is required" },
    { status: 400 },
  );
}
