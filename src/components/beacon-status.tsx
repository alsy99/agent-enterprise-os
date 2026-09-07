"use client";

import { useState } from "react";

type ServiceStatus = "operational" | "degraded" | "outage";

type Service = {
  id: string;
  name: string;
  status: ServiceStatus;
  detail: string;
};

type Incident = {
  id: string;
  title: string;
  when: string;
  severity: "minor" | "major" | "resolved";
  summary: string;
};

const SERVICES: Service[] = [
  {
    id: "api",
    name: "Public API",
    status: "operational",
    detail: "Latency p95 under 120ms",
  },
  {
    id: "web",
    name: "Web app",
    status: "operational",
    detail: "Edge healthy in all regions",
  },
  {
    id: "worker",
    name: "Background worker",
    status: "operational",
    detail: "Queue depth normal",
  },
  {
    id: "auth",
    name: "Sign-in",
    status: "operational",
    detail: "No elevated error rate",
  },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc-1",
    title: "Elevated API latency in us-east",
    when: "Mar 12 · resolved in 18m",
    severity: "resolved",
    summary: "A single region node saturated. Traffic shifted; no data loss.",
  },
];

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-teal-400",
  degraded: "bg-amber-400",
  outage: "bg-rose-400",
};

export function BeaconStatus() {
  const services = SERVICES;
  const incidents = INCIDENTS;
  const overall: ServiceStatus = "operational";

  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(45,212,191,0.18),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgba(56,189,248,0.12),transparent_45%),linear-gradient(180deg,#0a0f14_0%,#111827_48%,#0b1220_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pb-2 pt-8 sm:px-10 sm:pt-10">
        <a
          href="/beacon"
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-teal-50 sm:text-3xl"
        >
          Beacon
        </a>
        <a
          href="/"
          className="text-sm text-zinc-400 transition hover:text-teal-200"
        >
          Agent Suite
        </a>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-5xl flex-col justify-center px-6 pb-16 pt-10 sm:px-10 sm:pt-14">
        <section className="max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="mb-4 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
            Beacon
          </p>
          <h1 className="max-w-xl text-2xl font-medium leading-snug text-zinc-100 sm:text-3xl">
            Know your product is up — before your users ask.
          </h1>
          <p className="mt-4 max-w-lg text-base text-zinc-400 sm:text-lg">
            A calm public status page for indie teams. One glance at health,
            incidents, and what we&apos;re fixing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#live"
              className="inline-flex items-center justify-center rounded-md bg-teal-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300"
            >
              View live status
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-zinc-600/80 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-teal-500/50 hover:text-teal-100"
            >
              Built by Agent Suite
            </a>
          </div>
        </section>

        <section id="live" className="mt-20 scroll-mt-10 sm:mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                Live status
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Simulated signals for the dry-run product slice.
              </p>
            </div>
            <p className="flex items-center gap-2 text-sm font-medium text-teal-200">
              <span
                className={`h-2.5 w-2.5 animate-pulse rounded-full ${STATUS_DOT[overall]}`}
              />
              All systems {STATUS_LABEL[overall].toLowerCase()}
            </p>
          </div>

          <ul className="mt-8 divide-y divide-zinc-800/80 border-y border-zinc-800/80">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex flex-col gap-1 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-100">{service.name}</p>
                  <p className="text-sm text-zinc-500">{service.detail}</p>
                </div>
                <p className="flex items-center gap-2 text-sm text-zinc-300">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_DOT[service.status]}`}
                  />
                  {STATUS_LABEL[service.status]}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-14">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
              Recent incidents
            </h3>
            {incidents.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No open incidents. Quiet is good.
              </p>
            ) : (
              <ul className="mt-6 space-y-6">
                {incidents.map((incident) => (
                  <li key={incident.id} className="max-w-2xl">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {incident.when} · {incident.severity}
                    </p>
                    <p className="mt-1 text-base font-medium text-zinc-100">
                      {incident.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {incident.summary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
