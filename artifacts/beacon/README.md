# Beacon — lifecycle dry-run product

Beacon is the concrete app slice produced by the Agent Suite dry run:

**market research → product design → development → deployment → monitoring**

## What it is

A calm public status page for indie SaaS: overall health, service list, and a short incident timeline.

## Run

From the Agent Suite repo root:

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123/beacon](http://127.0.0.1:43123/beacon).

## Lifecycle mapping

| Stage | Owner capability | Artifact |
| --- | --- | --- |
| Market research | `research` (Kai) | ICP, competitors, success metric in suite History |
| Product design | `design` (specialist) | UX / visual memo in suite History |
| Development | `build` (Remy) | `/beacon` route + `BeaconStatus` UI |
| Deployment | `deploy` (specialist) | Pages + Cloud API checklist in History |
| Monitoring | `monitor` (specialist) | Golden signals + runbook in History |
| Review / learn | Sable / Iori | Verdict + playbook lessons |

## Suite dry run

Submit this brief to Nova on the dashboard (or `POST /api/objectives`):

> Full lifecycle dry run from scratch: market research, product design, development, deployment, and monitoring for Beacon — a public status page for indie SaaS founders.
