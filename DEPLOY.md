# Deploying DGOS — Hybrid Setup
### Vercel (frontend) + Render (backend + database)

Vercel hosts the React client — fast, never sleeps, global CDN.
Render hosts the Node.js API and PostgreSQL — reliable free tier for a demo backend.

Total time: about 20–30 minutes.

---

## What you'll need

- A GitHub account (free) — github.com
- A Render account (free) — render.com
- A Vercel account (free) — vercel.com

---

## Step 1 — Push the code to GitHub

In your `dgos` folder on your computer, open a terminal:

```bash
git init
git add .
git commit -m "Initial DGOS prototype"
```

Then create a new repository on GitHub (call it `dgos`), and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dgos.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Create the database on Render

1. Log in to render.com
2. Click **New** → **PostgreSQL**
3. Settings:
   - Name: `dgos-db`
   - Plan: **Free**
   - Region: Frankfurt (closest to Kenya)
4. Click **Create Database**
5. Wait about 1 minute for it to be ready
6. On the database page, click **Connect** and note these values:
   - Host, Port, Database, Username, Password

---

## Step 3 — Deploy the API server on Render

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Settings:
   - **Name**: `dgos-server`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Free
4. Under **Environment Variables**, add all of these:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `JWT_SECRET` | any long random string, e.g. `dgos-mot-2025-xK9mP2qR` |
   | `DB_HOST` | from your database connection details |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | from your database connection details |
   | `DB_USER` | from your database connection details |
   | `DB_PASSWORD` | from your database connection details |

5. Click **Create Web Service**
6. Wait for the first deploy — it auto-initializes the database with all seed data
7. Once deployed, copy your server URL — it looks like:
   ```
   https://dgos-server.onrender.com
   ```

---

## Step 4 — Deploy the frontend on Vercel

1. Log in to vercel.com
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Settings:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`  ← important, change this from the default
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
5. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | `dgos-server.onrender.com` (your Render server URL, **without** `https://`) |

6. Click **Deploy**
7. Wait about 2–3 minutes for the build
8. Vercel gives you a URL like:
   ```
   https://dgos.vercel.app
   ```

---

## Step 5 — Test it

Visit your Vercel URL. You should see the role picker landing page immediately.

Pick a role and verify:
- ✅ Landing page loads instantly
- ✅ Login works (first load may take ~30 seconds — server waking up)
- ✅ Dashboard loads with real data
- ✅ Onboarding overlay appears
- ✅ Notifications, search, all modules work

---

## Sharing the demo

Share just the Vercel URL — that's all anyone needs:

```
https://dgos.vercel.app
```

The landing page explains the system and guides visitors from there.

---

## Important notes

**Why the first load is slow:**
Render's free tier puts the server to sleep after 15 minutes of inactivity. The first API call after a quiet period takes ~30 seconds to wake up. The Vercel frontend itself loads instantly — only the data calls are delayed. Worth telling people: "If it seems to hang after you pick a role, wait 30 seconds — the server is waking up."

**The free Render PostgreSQL expires after 90 days.**
You'll get an email before it expires. Creating a new database and updating the environment variables on your server service takes about 5 minutes.

**The database auto-seeds on first deploy.**
When the server starts in production and finds no tables, it runs all schema and seed files automatically. You don't need to run any setup commands manually.

---

## Updating the demo

When you make changes to the code locally:

```bash
git add .
git commit -m "What you changed"
git push
```

Both Vercel and Render detect the push automatically and redeploy. Vercel takes ~2 minutes, Render takes ~3 minutes.

---

## Do I need to delete my existing local folder?

No. The only change to the codebase for deployment is the `client/vercel.json` file (already included). Your local setup continues to work exactly as before with `npm start` in both `server` and `client`. The deployment is a separate path from local development — they don't interfere with each other.

