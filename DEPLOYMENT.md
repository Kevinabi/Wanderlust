# Deployment Runbook — Wanderlust → Vercel

One-time setup, then every push to `main` auto-builds, tests, and deploys.
Run these commands on your own machine (Windows PowerShell or Git Bash).

---

## 0. Clean up the leftover git folder (one time)

A partial `.git` folder may exist from setup. Remove it, then init fresh:

```powershell
cd C:\Users\admin\wanderlust
Remove-Item -Recurse -Force .git   # ignore "not found"
git init
git add .
git commit -m "Wanderlust: serverless API + test/validate/deploy pipeline"
```

Confirm `.env` is NOT in the commit (it's gitignored). `git status` should never list `.env`.

---

## 1. Push to GitHub

```powershell
# create an empty repo on github.com first (no README), then:
git branch -M main
git remote add origin https://github.com/<you>/wanderlust.git
git push -u origin main
```

---

## 2. Create the Vercel project

1. Go to https://vercel.com → **Add New → Project** → import the `wanderlust` repo.
2. Framework preset: **Vite** (auto-detected). Build is already set in `vercel.json`.
3. Add the environment variable:
   - **Settings → Environment Variables → Add**
   - Name `RAPIDAPI_KEY`, value = your RapidAPI key, scope **Production** (and Preview if you want PR previews to hit the API).
4. Click **Deploy**. First deploy confirms everything works.

That alone gives you auto-deploys on every push (Vercel's own Git integration).

---

## 3. (Optional but recommended) GitHub Actions gate before deploy

The included workflow (`.github/workflows/ci.yml`) runs lint + unit + build + E2E
on every PR, and only deploys to production from `main` when green. To use it,
add these repository secrets (**GitHub repo → Settings → Secrets and variables → Actions**):

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | run `vercel link` locally, then read `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | same `.vercel/project.json` |

```bash
npm i -g vercel
vercel link          # links this folder to the Vercel project, writes .vercel/project.json
cat .vercel/project.json   # copy orgId + projectId into the GitHub secrets
```

> If you use the GitHub Actions deploy, turn OFF Vercel's auto-deploy in
> Vercel → Settings → Git (so you don't deploy twice). Otherwise skip step 3
> entirely and just let Vercel's built-in Git integration deploy.

---

## 4. Daily workflow

```bash
git checkout -b my-feature
# ...make changes...
npm run validate        # gate locally before pushing
git commit -am "..." && git push -u origin my-feature
# open a PR → CI runs the gate → merge to main → production deploy
```

---

## Local development

```bash
cp .env.example .env    # then paste your RAPIDAPI_KEY
npm install
npm run dev:all         # vite (5173) + express api (3001)
```

## Troubleshooting

- **API 503 "RAPIDAPI_KEY not configured"** → set `RAPIDAPI_KEY` in `.env` (local) or Vercel env (prod).
- **Frontend calls localhost in prod** → it shouldn't; `API_BASE` switches to `/api` automatically on build.
- **CI E2E flaky** → Playwright retries twice in CI; see the uploaded `playwright-report` artifact.
