import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { startWorker, stopWorker } from "@/lib/suite/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** HTML form POST for Wake/Pause without client JS. */
export async function POST(request: Request) {
  ensureSuiteAwake();
  const form = await request.formData();
  const action = String(form.get("action") ?? "start");
  const returnTo = String(form.get("returnTo") ?? "/");
  const origin = new URL(request.url).origin;
  const dest = returnTo.startsWith("/") ? `${origin}${returnTo}` : `${origin}/`;

  if (action === "stop") stopWorker();
  else startWorker({ intervalMs: 2500, mode: "embedded" });

  return NextResponse.redirect(dest, 303);
}
