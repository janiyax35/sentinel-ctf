# Setting up Sentinel CTF

How to deploy your own instance on **Supabase** (auth, database, files) and **Vercel** (static site + serverless API). Both free plans are enough. Work through the parts in order.

> Never commit flags, `.env` files or the service-role key. `.gitignore` already blocks the common ones.

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase](#2-supabase)
3. [Configure the code](#3-configure-the-code)
4. [Deploy to Vercel](#4-deploy-to-vercel)
5. [First admin and players](#5-first-admin-and-players)
6. [Flags](#6-flags)
7. [Evidence files and live-target links](#7-evidence-files-and-live-target-links)
8. [Custom domain (optional)](#8-custom-domain-optional)
9. [Run locally (optional)](#9-run-locally-optional)
10. [Updating an existing deployment](#10-updating-an-existing-deployment)
11. [Dry-run checklist](#11-dry-run-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

- A GitHub account with a copy of this repository (keep it **private** if it will ever hold answer material).
- A [Supabase](https://supabase.com) account and a [Vercel](https://vercel.com) account.
- Node.js 18+ locally. You only need it for `vercel dev` and `tools/hash-flag.js`; the deployed site has no build step.

## 2. Supabase

**2.1 Create the project.** New project → pick a name, a strong database password and the nearest region. Wait for it to finish provisioning.

**2.2 Create the schema.** SQL Editor → New query → paste all of `supabase/schema.sql` → **Run**. This creates the tables, turns on row-level security everywhere (with no policies, so the public keys can read nothing), builds the `scoreboard` view and adds the trigger that creates a profile for every new user.

**2.3 Seed the cases.** New query → paste all of `supabase/seed.sql` → **Run**. It inserts the six cases, their intel slots with point costs, the evidence file records and a placeholder access link. It does **not** contain any answer material: there are no flags, and the intel text is a placeholder. Fill in the intel text from **Sentinel Control → Intel**, or, if you keep a private `supabase/seed.local.sql` (gitignored), run it right after `seed.sql`.

Only run `seed.sql` on a fresh database. Re-running it on a live event deletes and re-creates the intel rows, which also wipes every player's unlocked intel.

**2.4 Create the storage bucket.** Storage → New bucket → name it exactly `challenge-files` and leave it **private**.

**2.5 Turn off public sign-up.** Authentication → Sign In / Providers → turn off **Allow new users to sign up**. Keep the Email provider on for password login. From now on only the admin creates accounts.

**2.6 Copy your keys.** Project Settings → API. You need:

| Value | Where it goes | Secret? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | `public/config.js` and Vercel | no |
| anon / publishable key | `public/config.js` | no |
| service_role key | Vercel env only | **yes** |

## 3. Configure the code

**3.1 Public config.** Edit `public/config.js`:

```js
window.SENTINEL_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-or-publishable-key"
};
```

Use the bare project URL, without `/rest/v1/`. Both values are safe in the browser.

**3.2 Flag pepper.** Generate a random secret used to hash every flag:

```bash
openssl rand -hex 32
```

Keep it secret, and **don't change it once flags are set**. A new pepper makes every stored flag hash stop matching.

Commit and push the `config.js` change.

## 4. Deploy to Vercel

1. Vercel → **Add New → Project** → import the repository.
2. Leave **Root Directory** as the repository root (it contains `api/`, `public/` and `vercel.json`). Framework preset: **Other**. No build command.
3. Add these environment variables for all environments:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your project URL, no `/rest/v1/` |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
| `FLAG_PEPPER` | the output of `openssl rand -hex 32` |
| `CHALLENGE_BUCKET` | `challenge-files` |

4. **Deploy.** Vercel serves `public/` as the site and `api/` as serverless functions. There are 8 functions, well under the Hobby plan limit of 12.

If you change an environment variable later, **redeploy** (Deployments → ⋯ → Redeploy). Functions only read env vars at deploy time.

## 5. First admin and players

**5.1 Create the admin.** Supabase → Authentication → Users → **Add user → Create new user**. Enter an email and password and tick **Auto Confirm User**. The trigger creates a `player` profile; promote it in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

**5.2 Sign in** on your Vercel URL. A **Sentinel Control** link appears in the navigation.

**5.3 Add players** from **Sentinel Control → Responders → Create responder** (email, display name, temporary password, role). Accounts are created already confirmed.

Players change their temporary password themselves under **Dossier → Change password**. If someone forgets theirs, reset it for them from **Responders → Edit**.

## 6. Flags

Flags are stored only as HMAC hashes, so you type each one once in the console and it is never shown again:

1. **Sentinel Control → Challenges** → the key icon on a case.
2. Enter the flag, either the full `Eclipse{...}` or just the part inside the braces, and save.
3. Repeat for every case. The **Flag** column turns to `set`.

You can replace a flag at any time the same way.

**Optional decoy flag.** A case can also have a decoy that shows a themed "decoy detected" message instead of a plain rejection. Hash it with the same pepper:

```bash
FLAG_PEPPER=your-pepper node tools/hash-flag.js "Eclipse{your_decoy_here}"
```

Add `--ci` before the flag for a case-insensitive case. Then store the printed hash:

```sql
update public.challenge_flags set decoy_hmac = '<printed-hash>'
where challenge_id = (select id from public.challenges where slug = '<case-slug>');
```

## 7. Evidence files and live-target links

**Evidence.** In Supabase Storage, upload each downloadable file into `challenge-files` at the path its record uses. **Sentinel Control → Evidence** lists every registered path. Only upload files players are meant to download, never generator or solver scripts. Players get a fresh signed link that expires after 60 seconds on each click.

**Live targets.** For a case with a hosted target, go to **Sentinel Control → Access links**. Set the primary URL, and add a **backup** link you can switch on if the primary goes down. Post a **Broadcast** so players know about the change. Only `http(s)` links are accepted.

## 8. Custom domain (optional)

1. Vercel → Project → Settings → Domains → add e.g. `ctf.example.com`.
2. At your DNS provider, add the CNAME record Vercel shows (and the TXT verification record if it asks for one). On Cloudflare, set the CNAME to **DNS only** (grey cloud) so Vercel can issue the certificate.
3. Wait for **Valid Configuration**. No code change is needed.

## 9. Run locally (optional)

Opening the HTML files directly won't work, because every page calls `/api`. Use the Vercel dev server:

```bash
npm i -g vercel
```

```bash
vercel link
```

```bash
vercel env pull .env.local
```

```bash
vercel dev
```

Then open the URL it prints (usually `http://localhost:3000`). Local runs use the **same Supabase database** as your deployment, so any reset or delete you test there affects real data.

## 10. Updating an existing deployment

If your database was created before the leaderboard moderation feature, run `supabase/migration_leaderboard.sql` once in the SQL Editor. It adds the `hidden_from_board` column and rebuilds the scoreboard view without touching existing data. Code changes deploy automatically when you push to the branch Vercel tracks.

## 11. Dry-run checklist

Before the event, check each of these with a test player and your admin account:

- [ ] A player sees all visible cases on the board.
- [ ] Evidence downloads work while signed in, with a fresh link every click.
- [ ] A wrong flag is rejected, and the audit log shows it.
- [ ] A correct flag is accepted once, and the score goes up.
- [ ] A sixth submission within a minute hits the cooldown.
- [ ] Intel #2 stays locked until #1 is unlocked, and each unlock costs its set points.
- [ ] The scoreboard shows the player; admins, banned and hidden responders don't appear.
- [ ] A player who visits `/admin` gets sent back, and admin API calls return 403.
- [ ] Changing a flag, an intel cost, an access link and a broadcast all work from the console.
- [ ] Afterwards: **Responders → Testing & reset → Full reset** clears scores and the audit log for a fresh start.

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| Pages load but every API call fails, or "Not authenticated" after signing in | Check the four Vercel env vars (`SUPABASE_URL` must not end in `/rest/v1/`), then redeploy. |
| Sign-in itself fails | `public/config.js` has the wrong URL or anon key, or the Email provider is off. |
| Downloads fail | The bucket must be named `challenge-files`, files must be at the registered paths, and `CHALLENGE_BUCKET` must be set. |
| A correct flag is rejected | The flag isn't set for that case, or `FLAG_PEPPER` changed after it was set. Set the flag again. |
| Scoreboard is empty | Only active, visible, non-admin players appear. Solve something with a player account. |
| The admin console sends you away | Your profile's `role` isn't `admin` (see 5.1). |
| Everything fails after a quiet week | Free Supabase projects pause when idle. Open the dashboard to resume it. |
| `vercel dev` functions don't see env vars | Run `vercel env pull .env.local` again. |
