<div align="center">

<a href="https://ctf.janith.qzz.io"><img src=".github/readme/assets/hero.svg" width="100%" alt="SENTINEL CTF: Operation Silent Dawn, a custom six-stage CTF platform. Terminal jd@janith: ~/sentinel-ctf, CASE-001, running ./sentinel --brief. Modules: hmac flag vault, point-cost intel, live scoreboard, sentinel control. Radar: 6 stages, 6 domains. Status: live, invite-only. CTF platform, 2026."></a>

<a href="https://ctf.janith.qzz.io"><img src=".github/readme/assets/btn-live.svg" height="40" alt="Live platform"></a>&nbsp;
<a href="https://janith.qzz.io/#cases"><img src=".github/readme/assets/btn-case.svg" height="40" alt="Case file"></a>&nbsp;
<a href="docs/SETUP.md"><img src=".github/readme/assets/btn-setup.svg" height="40" alt="Setup guide"></a>&nbsp;
<a href="mailto:janithmihijaya123@gmail.com"><img src=".github/readme/assets/btn-email.svg" height="40" alt="Email"></a>

<img src="https://img.shields.io/badge/license-MIT-B6FF3B?style=flat-square&labelColor=10151C" alt="License: MIT">
<img src="https://img.shields.io/badge/node-%E2%89%A518-B6FF3B?style=flat-square&labelColor=10151C&logo=nodedotjs&logoColor=B6FF3B" alt="Node 18+">
<img src="https://img.shields.io/badge/npm%20deps-0-B6FF3B?style=flat-square&labelColor=10151C" alt="npm dependencies: 0">
<img src="https://img.shields.io/badge/status-invite--only-B6FF3B?style=flat-square&labelColor=10151C" alt="Status: invite-only">

</div>

<details>
<summary><b>tl;dr</b>: the 20-second plain-text version</summary>
<br>

- **What:** a custom CTF platform and a six-stage incident-response challenge, built instead of using CTFd.
- **My role:** I wrote the story and the six stages, and built the whole platform: the frontend, the serverless API, the database schema and the admin console.
- **Stack:** static HTML/CSS/JS, Vercel serverless functions (Node, no npm packages), Supabase (Auth, PostgreSQL with row-level security, Storage).
- **Result:** deployed at [ctf.janith.qzz.io](https://ctf.janith.qzz.io) as an invite-only platform.
- **Run it:** `vercel dev` after the setup in [docs/SETUP.md](docs/SETUP.md).

</details>

<br>

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-overview-light.svg"><img src=".github/readme/assets/head-overview.svg" width="100%" alt="01 overview. $ cat case-001.md"></picture>

Sentinel CTF is the platform behind **Operation Silent Dawn**, a capture-the-flag event I built for a Year 3 penetration testing cohort. Players work through one connected story across six stages, each in a different security domain.

I built my own platform instead of using CTFd so the event could work the way I designed it. Hints cost fixed points that I set, not a percentage of the score. Live targets have backup links I can switch mid-event, and the whole thing matches the story's look.

The platform is a static frontend on Vercel, eight serverless functions for everything that needs a secret, and Supabase for accounts, data and files. Flags are only ever stored as peppered HMAC hashes, so even a full database leak gives away no answers.

<img src=".github/readme/assets/results.svg" width="100%" alt="6 stages across 6 domains; 1,400 total points; 8 serverless functions; 0 npm dependencies.">

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-operation-light.svg"><img src=".github/readme/assets/head-operation.svg" width="100%" alt="02 the operation. $ cat briefing.txt"></picture>

A cyber syndicate called **The Eclipse** has breached the telemetry network of the National Aerospace Observatory, stolen classified satellite schematics and wiped the audit trails. **Sentinel**, the observatory's intrusion-detection daemon, has isolated what the attackers left behind. Players are the incident responders who follow that trail before the schematics are sold.

| Stage | Case | Title | Domain | Difficulty | Points |
|:---:|---|---|---|---|---:|
| 1 | STEG-01 | The Intercepted Frequency | Steganography | Easy | 100 |
| 2 | OSINT-02 | Ground Telemetry | OSINT | Easy–Moderate | 150 |
| 3 | WEB-03 | The Staging Drop | Web exploitation | Moderate | 200 |
| 4 | NET-04 | Operation Silent Frequency | Networking | Moderate | 250 |
| 5 | CRYPTO-05 | The Weak Cipher | Cryptography | Moderate–Hard | 300 |
| 6 | REV-06 | The Kill-Switch Binary | Reverse engineering | Hard | 400 |

Every flag uses the format `Eclipse{...}`. This repository contains the platform only. The challenge files, flags and solutions are kept out of it.

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-features-light.svg"><img src=".github/readme/assets/head-features.svg" width="100%" alt="03 features. $ ls ./modules"></picture>

<p align="center">
<img src=".github/readme/assets/card-flags.svg" width="49%" alt="F-01, flag validation. Flags never stored in plaintext: every submission is normalised and checked against a peppered HMAC-SHA256 hash with a timing-safe compare. A database leak reveals no answers, and a decoy flag gets its own themed response. Tags: HMAC-SHA256, timingSafeEqual, pepper. 0 plaintext flags stored.">
<img src=".github/readme/assets/card-intel.svg" width="49%" alt="F-02, hint economy. Intel with fixed point costs: each case has two intel drops with a cost the admin sets, not a percentage. The second unlocks only after the first, and the cost is charged once, at unlock. Tags: progressive unlock, admin-set costs. 12 intel drops, 10 to 80 points.">
</p>
<p align="center">
<img src=".github/readme/assets/card-terminal.svg" width="49%" alt="F-03, submissions. Rate-limited flag terminal: a flag terminal with a fixed Eclipse{ prefix, a per-responder rate limit and a cooldown ring. Wrong guesses go to the audit log; correct flags never do. Tags: 429 cooldown, audit log. 5 tries per 60 seconds.">
<img src=".github/readme/assets/card-scoreboard.svg" width="49%" alt="F-04, scoring. Live scoreboard: a Postgres view scores solve points minus intel spent, with ties broken by time. The page shows a podium and a score timeline, and leaves out admins, banned and hidden responders. Tags: postgres view, chart.js. 1,400 points on the board.">
</p>
<p align="center">
<img src=".github/readme/assets/card-control.svg" width="49%" alt="F-05, admin. Sentinel Control console: cases, flags, intel, evidence, access links, the audit log and broadcasts in one console, plus responder moderation: ban, hide, reset or delete. Every action is re-checked on the server. Tags: server-side role checks, self-lockout guard. 8 console tabs.">
<img src=".github/readme/assets/card-delivery.svg" width="49%" alt="F-06, delivery. Evidence and live-target links: evidence files sit in a private bucket and download through signed URLs that expire after 60 seconds. Live targets get primary and backup links the admin can switch mid-event. Tags: private bucket, signed urls, failover. 60 second signed-URL lifetime.">
</p>

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-architecture-light.svg"><img src=".github/readme/assets/head-architecture.svg" width="100%" alt="04 architecture. $ tree -L 2"></picture>

<img src=".github/readme/assets/architecture.svg" width="100%" alt="Architecture in three zones. Internet (untrusted): CDN libraries (pinned, SRI hashes), the responder browser (static UI, anon key) and Cloudflare DNS (ctf.janith.qzz.io). Vercel: static pages (CSP, nosniff, deny frames), /api with 8 functions (Node runtime, 0 npm deps) and env secrets (service key, flag pepper). Supabase: Auth (email and password, signup off), Postgres (RLS on all tables, deny-all) and Storage (private bucket, 60 second signed URLs). The browser loads the CDN libraries, resolves the domain through Cloudflare DNS, gets static pages from Vercel, signs in directly with Supabase Auth and sends every flag, hint and admin request to the /api functions. The functions read the env secrets, verify the token with Supabase Auth, query Postgres and sign Storage URLs. Hot path: flag submission, browser to /api/submit to the HMAC check to Postgres with the service role.">

The browser only signs in and renders pages. Anything that touches a flag, a score or an admin action goes through `/api`, where the function checks the caller's token and role before using the service-role key. The anon key in `public/config.js` can't read any table directly, because row-level security is on everywhere with no policies.

```
api/            8 serverless functions + _lib/util.js (Supabase REST, HMAC, auth helpers)
public/         static pages, admin console, style.css and one JS file per page
supabase/       schema.sql (tables, RLS, scoreboard view), seed.sql, migrations
tools/          hash-flag.js (computes a flag HMAC for the decoy)
vercel.json     security headers and clean URLs
```

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-stack-light.svg"><img src=".github/readme/assets/head-stack.svg" width="100%" alt="05 stack. $ nmap -sV sentinel-ctf"></picture>

<img src=".github/readme/assets/stack.svg" width="100%" alt="nmap -sV sentinel-ctf. 443/tcp open https: Vercel edge, static HTML/CSS/JS, strict CSP. 8080/tcp open node-api: Vercel serverless, 8 functions, 0 npm deps. 9999/tcp open gotrue: Supabase Auth, email and password, signup off. 5432/tcp open postgresql: Supabase, row-level security on every table. 5000/tcp open storage: Supabase Storage, private bucket, signed URLs. 8443/tcp open cdn: jsDelivr and cdnjs, pinned versions, SRI hashes. 31337/tcp open flag-vault: HMAC-SHA256, peppered, timing-safe compare. 7 services open.">

The frontend has no build step and no bundled dependencies. Every library loads from a CDN, pinned to an exact version with a Subresource Integrity hash:

| Library | Version | Used for |
|---|---|---|
| `@supabase/supabase-js` | 2.45.4 | sign-in and session handling |
| `@tabler/icons-webfont` | 3.19.0 | icons |
| `marked` + `dompurify` | 12.0.2 / 3.1.6 | rendering case briefings safely |
| `chart.js` | 4.4.4 | scoreboard timeline |
| `canvas-confetti` | 1.9.3 | the solve celebration |

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-screenshots-light.svg"><img src=".github/readme/assets/head-screenshots.svg" width="100%" alt="06 screenshots. $ ls ./screenshots"></picture>

| | |
|:---:|:---:|
| <img src=".github/readme/screenshots/landing.png" alt="Landing page: the eclipse logo, the Operation Silent Dawn briefing, a Sentinel alert log and a Begin investigation button"><br><sub>Landing page</sub> | <img src=".github/readme/screenshots/board.png" alt="Mission board: score, rank, cases neutralised and intel spent, above the six case cards with their difficulty and points"><br><sub>Mission board</sub> |
| <img src=".github/readme/screenshots/case.png" alt="Case file for STEG-01, The Intercepted Frequency: the Sentinel alert briefing, an evidence file with its SHA-256, two locked intel items costing 10 and 20 points, and the flag terminal"><br><sub>Case file, intel and flag terminal</sub> | <img src=".github/readme/screenshots/scoreboard.png" alt="Scoreboard: a top-three podium, the score progression chart and the full ranking table"><br><sub>Scoreboard</sub> |
| <img src=".github/readme/screenshots/rules.png" alt="Rules of engagement: flag format, scoring, intel costs and the submission limit of 5 attempts every 60 seconds"><br><sub>Rules of engagement</sub> | <img src=".github/readme/screenshots/admin.png" alt="Sentinel Control admin console overview: tabs for challenges, intel, evidence, access links, responders, audit log and broadcast, with totals and solves per case"><br><sub>Sentinel Control (admin)</sub> |

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-quickstart-light.svg"><img src=".github/readme/assets/head-quickstart.svg" width="100%" alt="07 quick start. $ ./deploy --help"></picture>

You need a Supabase project and a Vercel account, both on free plans. The full walkthrough is in **[docs/SETUP.md](docs/SETUP.md)**. In short:

1. **Supabase:** run `supabase/schema.sql`, then `supabase/seed.sql`. Create a private bucket called `challenge-files`, and turn off public sign-up.
2. **Config:** put your project URL and anon key in `public/config.js`. Generate a flag pepper with `openssl rand -hex 32`.
3. **Vercel:** import the repo (no framework, no build step) and set these environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your project URL, e.g. `https://xxxx.supabase.co` (no `/rest/v1/`) |
| `SUPABASE_SERVICE_ROLE_KEY` | the service-role key (server only, never in the browser) |
| `FLAG_PEPPER` | the random hex string from step 2 |
| `CHALLENGE_BUCKET` | `challenge-files` |

4. **Admin:** create the first user in Supabase, promote it with SQL, then set each flag from **Sentinel Control → Challenges**.

To run it locally with the functions:

```bash
git clone https://github.com/janiyax35/sentinel-ctf.git
cd sentinel-ctf
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

> The deploy steps are the ones the live instance was built with. Running locally with `vercel dev` hasn't been re-tested from a fresh clone yet.

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-security-light.svg"><img src=".github/readme/assets/head-security.svg" width="100%" alt="08 security. $ cat SECURITY.md"></picture>

This is a security course project, so the platform is built so that an attack on it is harder than the challenges themselves.

| Control | Where | Why |
|---|---|---|
| Flags stored only as HMAC-SHA256 with a server-side pepper | `api/_lib/util.js`, `challenge_flags` | A database leak doesn't reveal any answers |
| Timing-safe comparison (`crypto.timingSafeEqual`) | `api/submit.js` | No timing side channel on flag checks |
| Rate limit of 5 submissions per 60 s per responder | `api/submit.js` | Stops brute-forcing flags |
| Row-level security on every table, with no policies | `supabase/schema.sql` | The public anon key can't read or write any table |
| Service-role key and pepper only in Vercel env vars | `api/_lib/util.js` | Secrets never reach the browser |
| Every admin action re-checks the role on the server, with self-lockout and last-admin guards | `api/admin.js` | Hiding the UI isn't the control; an admin can't lock the platform out |
| Strict CSP with no inline scripts, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff` | `vercel.json` | XSS, clickjacking and MIME sniffing |
| Pinned CDN versions with Subresource Integrity | `public/*.html` | A tampered CDN file is refused by the browser |
| Briefings sanitised with DOMPurify; user text set with `textContent` | `public/assets/` | Stored XSS through case text or display names |
| Private bucket and 60-second signed URLs | `api/file.js` | Evidence can't be hotlinked or shared outside the event |
| Audit log keeps wrong guesses but never correct flags | `api/submit.js`, `submissions` | Cheating can be investigated without leaking answers |
| Public sign-up disabled; accounts created by the admin | Supabase Auth | Invite-only event |

<picture><source media="(prefers-color-scheme: light)" srcset=".github/readme/assets/head-contact-light.svg"><img src=".github/readme/assets/head-contact.svg" width="100%" alt="09 contact. $ finger janith"></picture>

Built by **Janith Deshan**. The platform is invite-only: email me to be added to the access list. For questions or collaboration: [janithmihijaya123@gmail.com](mailto:janithmihijaya123@gmail.com) · [LinkedIn](https://linkedin.com/in/janithdeshan) · [janith.qzz.io](https://janith.qzz.io)

<a href="https://janith.qzz.io"><img src=".github/readme/assets/footer.svg" width="100%" alt="SENTINEL CTF"></a>

<p align="center"><sub>Graphics generated by <code>.github/readme/build.mjs</code>. Part of the case files at <a href="https://janith.qzz.io/#cases">janith.qzz.io</a>. MIT licensed.</sub></p>
