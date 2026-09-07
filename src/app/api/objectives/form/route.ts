import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { submitTaskBrief } from "@/lib/suite/orchestrator";
import { startWorker } from "@/lib/suite/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** HTML form POST (Safari-friendly) → redirect home. */
export async function POST(request: Request) {
  ensureSuiteAwake();
  startWorker({ intervalMs: 2500, mode: "embedded" });

  const form = await request.formData();
  const task = String(form.get("task") ?? "").trim();
  const origin = new URL(request.url).origin;

  if (!task) {
    return NextResponse.redirect(`${origin}/new?error=empty`, 303);
  }

  try {
    submitTaskBrief(task);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "failed";
    return NextResponse.redirect(`${origin}/new?error=${message}`, 303);
  }

  return NextResponse.redirect(`${origin}/`, 303);
}
