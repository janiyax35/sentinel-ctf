/* All README graphic text for sentinel-ctf. Edit wording here, then run:
   node .github/readme/build.mjs
   SVG text may only use ASCII plus · – — ’ … (the embedded font subset).
   Never put flags, solutions or answer hints in this file. */

export const project = {
  repo: "sentinel-ctf",
  caseId: "CASE-001",                       // matches janith.qzz.io js/data.js
  name: ["SENTINEL", "CTF"],                // second word is drawn in lime
  command: "./sentinel --brief",
  tagline: "Operation Silent Dawn · a custom six-stage CTF platform",
  focusLabel: "module:",
  focus: ["hmac flag vault", "point-cost intel", "live scoreboard", "sentinel control"],
  radarLabel: "6 STAGES · 6 DOMAINS",
  status: "live · invite-only",
  meta: "CTF platform · 2026"
};

/* key: [index, title, fake command shown on the right] */
export const sections = {
  overview: ["01", "overview", "cat case-001.md"],
  operation: ["02", "the operation", "cat briefing.txt"],
  features: ["03", "features", "ls ./modules"],
  architecture: ["04", "architecture", "tree -L 2"],
  stack: ["05", "stack", "nmap -sV sentinel-ctf"],
  screenshots: ["06", "screenshots", "ls ./screenshots"],
  quickstart: ["07", "quick start", "./deploy --help"],
  security: ["08", "security", "cat SECURITY.md"],
  contact: ["09", "contact", "finger janith"]
};

/* real numbers only (seed.sql, api/, public/*.html) */
export const results = [
  ["6", "stages · 6 domains"],
  ["1,400", "total points"],
  ["8", "serverless functions"],
  ["0", "npm dependencies"]
];

export const features = [
  {
    file: "card-flags", id: "F-01", type: "flag validation",
    title: "Flags never stored in plaintext",
    summary: "Every submission is normalised and checked against a peppered HMAC-SHA256 hash with a timing-safe compare. A database leak reveals no answers, and a decoy flag gets its own themed response.",
    stack: ["HMAC-SHA256", "timingSafeEqual", "pepper"],
    metric: ["0", "plaintext flags stored"]
  },
  {
    file: "card-intel", id: "F-02", type: "hint economy",
    title: "Intel with fixed point costs",
    summary: "Each case has two intel drops with a cost the admin sets, not a percentage. The second unlocks only after the first, and the cost is charged once, at unlock.",
    stack: ["progressive unlock", "admin-set costs"],
    metric: ["12", "intel drops · 10–80 pts"]
  },
  {
    file: "card-terminal", id: "F-03", type: "submissions",
    title: "Rate-limited flag terminal",
    summary: "A flag terminal with a fixed Eclipse{ prefix, a per-responder rate limit and a cooldown ring. Wrong guesses go to the audit log; correct flags never do.",
    stack: ["429 cooldown", "audit log"],
    metric: ["5", "tries per 60 s"]
  },
  {
    file: "card-scoreboard", id: "F-04", type: "scoring",
    title: "Live scoreboard",
    summary: "A Postgres view scores solve points minus intel spent, with ties broken by time. The page shows a podium and a score timeline, and leaves out admins, banned and hidden responders.",
    stack: ["postgres view", "chart.js"],
    metric: ["1,400", "points on the board"]
  },
  {
    file: "card-control", id: "F-05", type: "admin",
    title: "Sentinel Control console",
    summary: "Cases, flags, intel, evidence, access links, the audit log and broadcasts in one console, plus responder moderation: ban, hide, reset or delete. Every action is re-checked on the server.",
    stack: ["server-side role checks", "self-lockout guard"],
    metric: ["8", "console tabs"]
  },
  {
    file: "card-delivery", id: "F-06", type: "delivery",
    title: "Evidence and live-target links",
    summary: "Evidence files sit in a private bucket and download through signed URLs that expire after 60 seconds. Live targets get primary and backup links the admin can switch mid-event.",
    stack: ["private bucket", "signed urls", "failover"],
    metric: ["60 s", "signed-url lifetime"]
  }
];

/* nmap-style stack scan: [port, service, version, special?] */
export const scan = [
  ["443/tcp", "https", "vercel edge · static html/css/js · strict csp"],
  ["8080/tcp", "node-api", "vercel serverless · 8 functions · 0 npm deps"],
  ["9999/tcp", "gotrue", "supabase auth · email + password · signup off"],
  ["5432/tcp", "postgresql", "supabase · row-level security on every table"],
  ["5000/tcp", "storage", "supabase storage · private bucket · signed urls"],
  ["8443/tcp", "cdn", "jsdelivr + cdnjs · pinned versions · sri hashes"],
  ["31337/tcp", "flag-vault", "hmac-sha256 · peppered · timing-safe compare", true]
];

/* architecture: hand-placed nodes (x, y, w, h) inside an 840-wide window */
export const arch = {
  bounds: [
    { x: 16, y: 70, w: 196, h: 240, color: "red", label: "INTERNET · UNTRUSTED" },
    { x: 244, y: 70, w: 250, h: 240, color: "amber", label: "VERCEL" },
    { x: 526, y: 70, w: 298, h: 240, color: "amber", label: "SUPABASE" }
  ],
  nodes: {
    cdn: { x: 32, y: 100, w: 164, h: 46, label: "cdn libraries", sub: "pinned · sri hashes" },
    browser: { x: 32, y: 170, w: 164, h: 54, label: "responder browser", sub: "static ui · anon key" },
    dns: { x: 32, y: 248, w: 164, h: 46, label: "cloudflare dns", sub: "ctf.janith.qzz.io" },
    pages: { x: 262, y: 100, w: 214, h: 46, label: "static pages", sub: "csp · nosniff · deny frames" },
    api: { x: 262, y: 170, w: 214, h: 54, label: "/api · 8 functions", sub: "node runtime · 0 npm deps" },
    env: { x: 262, y: 248, w: 214, h: 46, label: "env secrets", sub: "service key · flag pepper" },
    auth: { x: 544, y: 100, w: 262, h: 46, label: "auth", sub: "email + password · signup off" },
    db: { x: 544, y: 170, w: 262, h: 54, label: "postgres", sub: "rls on all tables · deny-all" },
    storage: { x: 544, y: 248, w: 262, h: 46, label: "storage", sub: "private bucket · 60 s signed urls" }
  },
  /* orthogonal edges as point lists; hot = main data flow (animated) */
  edges: [
    { pts: [[114, 146], [114, 170]], end: "d" },
    { pts: [[114, 248], [114, 224]], end: "u", faint: true },
    { pts: [[196, 185], [228, 185], [228, 123], [262, 123]], end: "r" },
    { pts: [[196, 177], [204, 177], [204, 56], [675, 56], [675, 100]], end: "d", label: [440, 51, "sign-in · supabase-js"] },
    { pts: [[196, 205], [262, 205]], end: "r", hot: true },
    { pts: [[476, 180], [510, 180], [510, 123], [544, 123]], end: "r" },
    { pts: [[476, 205], [544, 205]], end: "r", hot: true },
    { pts: [[476, 214], [510, 214], [510, 271], [544, 271]], end: "r" },
    { pts: [[369, 248], [369, 224]], end: "u", faint: true }
  ],
  caption: "hot path: flag submission · browser -> /api/submit -> hmac check -> postgres (service role)"
};
