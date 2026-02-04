# Deploy Lottery to Vercel

This project is set up to deploy the lottery app (frontend + API) on [Vercel](https://vercel.com).

## What’s included

- **Static frontend** (Three.js lottery UI) from `product/dist`
- **API routes** (getTempData, getUsers, reset, saveData, errorData, export) via serverless functions
- **Rewrites** so the app still calls `/getTempData`, `/getUsers`, etc. (no frontend changes)

## Deploy steps

### 1. Push the repo to Git

Ensure the project is in a Git repo (e.g. GitHub, GitLab) and push the latest code.

### 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New…** → **Project**.
3. **Import** the Git repository that contains this lottery app.
4. Leave **Root Directory** as the repo root (where `vercel.json` and `product/` are).
5. Vercel will use the repo’s **Build and Output Settings** from `vercel.json`:
   - **Install command:** `npm install && cd product && npm ci`
   - **Build command:** `npm run build`
   - **Output directory:** `product/dist`
6. Click **Deploy**.

### 3. Optional: set environment variable

- **`LOTTERY_CACHE_DIR`** is set in `vercel.json` to `/tmp` so the server can write cache files (e.g. lottery state) in the serverless environment. You don’t need to change it unless you use a custom cache path.

### 4. Configure participants and prizes (before or after deploy)

- **Participants:** Update `server/data/users.xlsx` (keep the same file name and column format) and commit. Redeploy so the new file is used.
- **Prizes:** Edit `server/config.js` (prizes, `EACH_COUNT`, `COMPANY`) and commit. Redeploy.

## After deploy

- Your app will be available at `https://<your-project>.vercel.app`.
- Lottery state (winners, “not present” list) is stored under `/tmp` in the serverless function. It can reset when the function scales down or restarts. For long-running events, consider running the app locally or on a long-lived server (see README / Docker).

## Limitations on Vercel

- **Export to Excel:** The “export” API returns a success response with a file name; the file is written under the function’s cwd. Download via `location.href` to that path may not work as on a normal server. For reliable Excel download, use the app on a traditional server (e.g. `npm run serve` or Docker).
- **State:** In-memory and `/tmp` state are not shared across all instances and may be lost on cold starts. Fine for demos or short sessions; for production events, use a persistent backend or run the Node server yourself.

## Deploy from CLI (optional)

1. Install Vercel CLI: `npm i -g vercel`
2. In the project root (where `vercel.json` is), run:
   ```bash
   vercel
   ```
3. Follow the prompts (link to an existing project or create a new one).
4. For production: `vercel --prod`

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Push code to GitHub/GitLab |
| 2 | Vercel → Add New → Project → Import repo |
| 3 | Confirm root directory and use settings from `vercel.json` |
| 4 | Deploy |
| 5 | (Optional) Edit `server/data/users.xlsx` and `server/config.js`, then redeploy |
