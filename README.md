# Order Portal — Setup Guide

This walks you through getting your portal online. Total time: about **45 minutes** of clicking. No coding required, but you'll copy and paste a few things.

## What you'll end up with
- A real website at a URL like `your-portal.vercel.app`
- Your team logs in with email + password
- All data saved in the cloud, shared across the team
- 100% free for a team of 5-10 people

## What you'll need
- An email address
- About 45 minutes
- The 5 files in this folder: `index.html`, `app.js`, `config.js`, `database-setup.sql`, `README.md`

---

## Part 1: Set up the database (Supabase) — 15 minutes

Supabase is what stores your data and handles team logins.

### Step 1.1 — Make an account
1. Go to **supabase.com** and click **Start your project**
2. Sign up with email or GitHub (your call)
3. Once logged in, click **New project**
4. Fill in:
   - **Name:** Order Portal
   - **Database password:** Click "Generate a password" and **save it somewhere safe** (you probably won't need it again, but keep it just in case)
   - **Region:** pick the one closest to you
   - **Plan:** Free
5. Click **Create new project** and wait ~2 minutes while it sets up

### Step 1.2 — Create your database tables
1. In your Supabase project, click **SQL Editor** in the left sidebar (icon looks like `</>`)
2. Click **New query** (top right)
3. Open the `database-setup.sql` file from this folder in any text editor (Notepad works)
4. **Select all the text** (Ctrl+A or Cmd+A) and copy it
5. Paste it into the SQL Editor in Supabase
6. Click the **Run** button (bottom right, or press Ctrl+Enter / Cmd+Enter)
7. You should see "Success. No rows returned" at the bottom

✅ Database is ready.

### Step 1.3 — Get your API keys
You need two pieces of info to connect the portal to the database.

1. In Supabase, click the **gear icon** (Settings) in the bottom-left sidebar
2. Click **API** in the settings menu
3. You'll see two things you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **Project API keys** → **anon public** — a really long string starting with `eyJ...`
4. Keep this tab open — you'll copy these in the next step

### Step 1.4 — Plug the keys into your portal
1. Open the `config.js` file in any text editor
2. Replace `YOUR_SUPABASE_URL_HERE` with the **Project URL** (keep the quotes)
3. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with the **anon public key** (keep the quotes)
4. **Save the file**

Should look like:
```javascript
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

### Step 1.5 — (Optional but recommended) Skip email confirmation
By default, Supabase emails new users a confirmation link before they can sign in. For an internal team, you probably want to skip that.

1. In Supabase, click **Authentication** in the left sidebar
2. Click **Providers** → **Email**
3. Turn **OFF** the "Confirm email" toggle
4. Click **Save**

✅ Part 1 done. Database and auth are ready.

---

## Part 2: Put it online (Vercel) — 15 minutes

Vercel hosts the website for free.

### Step 2.1 — Make a Vercel account
1. Go to **vercel.com** and click **Sign up**
2. Sign up with GitHub, GitLab, or Bitbucket
   - If you don't have any of those, sign up for a free **GitHub** account first at github.com — takes 2 minutes
3. Once logged in to Vercel, you'll see a dashboard

### Step 2.2 — Upload your portal files
The easiest way is drag-and-drop:

1. On the Vercel dashboard, click **Add New** → **Project**
2. Look for the **"Deploy without Git"** option OR scroll down for a drag-and-drop area
   - If you can't find it: click **Continue with GitHub** instead, create a new repo, upload these 5 files, then deploy from there (slightly longer but works)
3. Drag your `order-portal` folder onto the upload area
4. Vercel will detect it's a static site — click **Deploy**
5. Wait ~30 seconds while it deploys
6. You'll get a URL like `order-portal-xyz.vercel.app` 🎉

### Step 2.3 — Test it
1. Click your new URL — you should see the login screen
2. Click "Create account" — sign up with your email + a password
3. You should land on the empty portal
4. Submit a test request
5. Flip to the Dashboard — your tile should appear
6. Refresh the page — the tile is still there ✨ (real persistence!)

✅ Part 2 done. Your portal is live.

---

## Part 3: Invite your team — 5 minutes

### Option A — Let them sign up themselves
Just share the URL. Each team member clicks "Create account," signs up with their email + password, and they're in.

### Option B — Pre-create accounts for them
1. In Supabase, click **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter their email and a temporary password
4. They sign in with that password and can change it later

### To pin in Teams
Once your portal is up, you can pin it as a tab in any Teams channel:
1. In Teams, go to the channel where your team wants the portal
2. Click the **+** at the top to add a tab
3. Choose **Website** as the tab type
4. Paste your Vercel URL
5. Save — now your portal is one click away inside Teams

---

## When you want changes

Come back to Claude and describe what you want. Claude will give you updated code. You either:
- **Drag-and-drop the new files** into Vercel's same deployment (it'll redeploy automatically), OR
- If you used GitHub: replace the files in your repo and Vercel auto-deploys

---

## Costs (real numbers)

- **Supabase free tier:** 500 MB database, 50,000 monthly active users, 5 GB bandwidth. Your team won't come close to any of these limits.
- **Vercel free tier:** 100 GB bandwidth, unlimited deployments. Same — you won't hit limits.

You're at $0/month for the foreseeable future.

---

## Troubleshooting

**"Failed to load tickets" or login does nothing**
- The keys in `config.js` are wrong. Double-check you copied the Project URL and anon key correctly, and re-deployed (re-uploaded to Vercel).

**"Email not confirmed" when signing in**
- Go to Supabase → Authentication → Providers → Email, turn OFF "Confirm email", save. Or check email for the confirmation link.

**Sign up works but tickets don't save**
- The SQL setup script wasn't run successfully, or only ran partially. Go back to Step 1.2 and re-run the SQL.

**Anything else**
- Open the browser's developer console (F12 or right-click → Inspect → Console) and look at any red error messages. Send those to Claude and you'll get a fix.
