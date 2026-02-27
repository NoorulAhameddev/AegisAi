Acceptance checklist — Personal Security Dashboard (apps/dashboard)

Verification steps to confirm the MVP is complete locally:

1) Start the worker (background):

```powershell
# from repo root
npm --workspace=apps/dashboard run worker
```

2) Start Next dev server:

```powershell
cd apps/dashboard
npm run dev
# open http://localhost:3000
```

3) Run a vulnerability scan:

- From the UI: click "Run Vulnerability Scan" on the Overview page.
- Or via API:

```bash
curl -X POST http://localhost:3000/api/vulns/scan
```

- Verify `.dashboard/vulnerabilities.json` is written and `/vulnerabilities` shows results.

4) Run security posture check:

- Open `/api/security-check` in browser or call via curl.
- Verify structured JSON with `passed` and `issues`.

5) Submit a dependency-upgrade job (safe flow):

```bash
curl -X POST http://localhost:3000/api/jobs -H 'Content-Type: application/json' -d '{"type":"dependency-upgrade","package":"left-pad","version":"1.1.0"}'
```

- Worker will perform safety checks (clean tree, detached HEAD, rebase). If tests fail, a remediation task is created in `.dashboard/tasks.json`.
- Job logs are in `.dashboard/jobs/<jobId>.log` and can be streamed at `/api/jobs/<jobId>/stream` (SSE) or viewed at `/api/jobs/<jobId>/logs`.

6) Tasks / Kanban:

- Visit `/tasks` to create and move tasks across columns (drag and drop).
- Tasks persist in `.dashboard/tasks.json`.

7) Activity log:

- Check `.dashboard/activity.log` for append-only JSONL entries recording automated actions.

8) Tests:

- Run tests for dashboard helpers:

```powershell
npx jest "apps/dashboard/__tests__" --runInBand
```

Notes & Safety:

- All `.dashboard/` files are local and gitignored.
- The worker never executes arbitrary shell jobs; allowed job types are enforced.
- Dependency upgrades do not push branches; created branches remain local for manual review.

If you'd like, I can next:
- Add CI workflow to run these tests automatically.
- Improve the dependency-upgrade policy to support minor/patch auto-upgrades with approval flow.
