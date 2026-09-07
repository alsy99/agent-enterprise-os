import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { submitTaskBrief } from "@/lib/suite/orchestrator";
import { startWorker } from "@/lib/suite/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("trycloudflare.com") ? "https" : "http");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }
  // Fall back to public tunnel-style Referer when bound to 0.0.0.0
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }
  return new URL(request.url).origin;
}

/** HTML form POST (Safari-friendly) → redirect home. */
export async function POST(request: Request) {
  ensureSuiteAwake();
  startWorker({ intervalMs: 2500, mode: "embedded" });

  const form = await request.formData();
  const task = String(form.get("task") ?? "").trim();
  const origin = requestOrigin(request);

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
