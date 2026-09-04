# Deploy: GitHub Pages (frontend) + Cursor Cloud (backend)

## Architecture

| Layer | Host | Command |
|---|---|---|
| Frontend (static) | **GitHub Pages** | `npm run build:pages` → `out/` |
| Backend API + worker | **Cursor Cloud agent VM** | `npm run api` on port `43124` |

The browser loads the Pages site and calls the API via `NEXT_PUBLIC_API_BASE` (CORS enabled).

> Cursor Cloud does **not** give a permanent public hostname. This setup uses a **Cloudflare quick tunnel** while the Cloud Agent is running. When the agent stops, the tunnel stops — restart `npm run api` + the tunnel on the next Cloud session.

## 1) Backend on Cursor Cloud

```bash
npm install
npm run api
# → http://0.0.0.0:43124  (health: /api/health)
```

Public tunnel (from the Cloud Agent shell):

```bash
./cloudflared tunnel --url http://127.0.0.1:43124
# copy the https://*.trycloudflare.com URL
```

Keep both processes running for the life of the Cloud Agent.

## 2) Frontend on GitHub Pages

This workspace is currently on **Origin**. GitHub Pages needs a **GitHub** repo.

1. Click **Create repo** in Cursor (or push this project to GitHub).
2. In the GitHub repo: **Settings → Pages → Source = GitHub Actions**.
3. Add Actions secret:
   - `NEXT_PUBLIC_API_BASE` = your Cloudflare tunnel URL (no trailing slash), e.g. `https://xxxx.trycloudflare.com`
4. Optional repo variable:
   - `NEXT_PUBLIC_BASE_PATH` = `/<repo-name>` for project pages (leave empty for `username.github.io` root sites).
5. Push to `main` — workflow `.github/workflows/pages.yml` builds and deploys.

Local static preview against the Cloud API:

```bash
NEXT_PUBLIC_API_BASE=https://xxxx.trycloudflare.com npm run build:pages
npx serve out
```

## 3) Local full-stack (unchanged)

```bash
npm run dev   # Next UI + App Router APIs on :43123
```

Or split locally:

```bash
npm run api   # :43124
NEXT_PUBLIC_API_BASE=http://127.0.0.1:43124 npm run dev
```
