# Aegis Dashboard (local-first)

This README explains how to run the dashboard app and the background worker locally for development.

## Start the background worker

The worker processes queued jobs (vulnerability scans, secret checks, etc.) and writes logs and metadata into the workspace `.dashboard/` folder.

Run from the repository root or from the `apps/dashboard` folder:

```powershell
# from repo root
npm --workspace=apps/dashboard run worker

# or from the dashboard folder
cd apps/dashboard
npm run worker
```

The worker will watch the `.dashboard/jobs` folder and pick up queued jobs.

## Start the dev server

```powershell
cd apps/dashboard
npm run dev
# open http://localhost:3000
```

## Enqueue a vulnerability scan

POST to `/api/vulns/scan` (no auth in MVP). The endpoint returns a job id. Visit `/jobs` in the UI to see job status and stream logs.

## Notes

- This system is local-first. The `.dashboard/` folder is gitignored and contains persisted data.
- The worker intentionally only allows predefined job types to avoid arbitrary command execution.
- For production-style background processing with Redis/BullMQ, set `QUEUE_MODE=redis` and implement the Redis-backed queue in `lib/queue.ts`.
