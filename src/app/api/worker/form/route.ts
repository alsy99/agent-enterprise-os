import { NextResponse } from "next/server";
import { ensureSuiteAwake } from "@/lib/suite";
import { startWorker, stopWorker } from "@/lib/suite/worker";

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

/** HTML form POST for Wake/Pause without client JS. */
export async function POST(request: Request) {
  ensureSuiteAwake();
  const form = await request.formData();
  const action = String(form.get("action") ?? "start");
  const returnTo = String(form.get("returnTo") ?? "/");
  const origin = requestOrigin(request);
  const dest = returnTo.startsWith("/") ? `${origin}${returnTo}` : `${origin}/`;

  if (action === "stop") stopWorker();
  else startWorker({ intervalMs: 2500, mode: "embedded" });

  return NextResponse.redirect(dest, 303);
}
