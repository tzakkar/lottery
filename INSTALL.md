# Lottery – Installation checklist

Use this list to install and run the repo locally.

## Prerequisites

- [ ] **Node.js** (v14 or later recommended)
- [ ] **npm** (comes with Node)
- [ ] **Git** (to clone the repo)

## Installation steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/moshang-xc/lottery.git
   cd lottery
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install frontend dependencies**
   ```bash
   cd product
   npm install
   cd ..
   ```

4. **Build the frontend**
   ```bash
   cd product
   npm run build
   cd ..
   ```

5. **Run the app**
   ```bash
   cd product
   npm run serve
   ```
   - This starts the server on port **8888** (or the port you pass) and serves the built app.
   - Open: **http://127.0.0.1:8888**

## Development / debugging

- **Run with hot reload (frontend only):**
  ```bash
  cd product
  npm run dev
  ```
  - Use this for frontend development; the dev server runs separately from the Express backend.

## Configuration (optional)

- **Participants (Excel):** Edit `server/data/users.xlsx` (keep file name and header format as in the original).
- **Prizes:** Edit `server/config.js` (prizes, `EACH_COUNT`, `COMPANY`).

## Quick checklist

| Step | Command / action |
|------|-------------------|
| 1 | `git clone ...` and `cd lottery` |
| 2 | `cd server` → `npm install` → `cd ..` |
| 3 | `cd product` → `npm install` → `cd ..` |
| 4 | `cd product` → `npm run build` → `cd ..` |
| 5 | `cd product` → `npm run serve` |
| 6 | Open http://127.0.0.1:8888 |

## Deploying to Vercel

See **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)** for full Vercel deployment steps and checklist.
