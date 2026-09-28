/* ==========================================================================
   Shared client logic for the Sentinel CTF platform.
   Depends on (loaded via CDN before this file):
     - @supabase/supabase-js v2  (global: supabase)
     - DOMPurify, marked        (for challenge markdown)
   Exposes window.App: { supa, session, me, api, guard, chrome, esc, mdSafe, fmtBytes, animateScore }
   ========================================================================== */
(function () {
  const cfg = window.SENTINEL_CONFIG || {};
  const supa = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const App = {
    supa: supa,
    session: null,
    me: null
  };

  /* ---- helpers ---- */
  App.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  };
  App.mdSafe = function (md) {
    if (!md) return "";
    const raw = window.marked ? window.marked.parse(md, { breaks: true }) : App.esc(md);
    return window.DOMPurify ? window.DOMPurify.sanitize(raw) : raw;
  };
  App.fmtBytes = function (n) {
    if (!n && n !== 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  };
  App.animateScore = function (to) {
    const node = document.getElementById("score-val");
    if (!node) return;
    const from = parseInt(node.textContent.replace(/\D/g, ""), 10) || 0;
    to = Math.round(to);
    if (from === to) { node.textContent = to; return; }
    node.classList.remove("up", "down");
    node.classList.add(to > from ? "up" : "down");
    const steps = 24, dur = 700;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      node.textContent = Math.round(from + (to - from) * (i / steps));
      if (i >= steps) {
        clearInterval(timer);
        node.textContent = to;
        setTimeout(() => node.classList.remove("up", "down"), 500);
      }
    }, dur / steps);
  };

  /* ---- API fetch (adds bearer token) ---- */
  App.api = async function (path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (App.session && App.session.access_token) {
      headers["Authorization"] = "Bearer " + App.session.access_token;
    }
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || ("Request failed (" + res.status + ")"));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  };

  /* ---- session + guards ---- */
  App.loadSession = async function () {
    const { data } = await supa.auth.getSession();
    App.session = data ? data.session : null;
    return App.session;
  };
  App.loadMe = async function () {
    try { App.me = await App.api("/api/me"); } catch (e) { App.me = null; }
    return App.me;
  };
  App.guard = async function (opts) {
    opts = opts || {};
    await App.loadSession();
    if (!App.session) {
      location.replace("/login?next=" + encodeURIComponent(location.pathname + location.search));
      return false;
    }
    await App.loadMe();
    if (opts.admin && (!App.me || App.me.role !== "admin")) {
      location.replace("/board");
      return false;
    }
    return true;
  };
  App.logout = async function () {
    await supa.auth.signOut();
    location.href = "/login";
  };

  /* ---- top chrome (nav + broadcast) ---- */
  App.chrome = async function (active) {
    const mount = document.getElementById("chrome");
    if (!mount) return;
    const me = App.me || {};
    const isAdmin = me.role === "admin";
    const initials = (me.display_name || "R")
      .split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const score = me.score == null ? 0 : me.score;

    function link(href, label, key, cls) {
      const a = active === key ? "active" : "";
      return `<a href="${href}" class="${cls || ""} ${a}">${label}</a>`;
    }

    mount.innerHTML = `
      <nav class="nav">
        <a class="brand" href="/board" aria-label="Sentinel home">
          <span class="eclipse" aria-hidden="true"></span>
          <span><span class="brand-name">SENTINEL</span><span class="brand-sub">MISSION CONTROL</span></span>
        </a>
        <div class="nav-links">
          ${link("/board", "Board", "board")}
          ${link("/scoreboard", "Scoreboard", "scoreboard")}
          ${link("/rules", "Rules", "rules")}
          ${isAdmin ? link("/admin", "Sentinel Control", "admin", "admin") : ""}
        </div>
        <div class="nav-right">
          <div class="score-pill" title="Your score">
            <span class="label">SCORE</span>
            <span class="value" id="score-val">${score}</span>
          </div>
          <div class="nav-menu">
            <button class="avatar" id="menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">${App.esc(initials)}</button>
            <div class="menu-pop hidden" id="menu-pop" role="menu">
              <div class="who"><b>${App.esc(me.display_name || "Responder")}</b><span>${isAdmin ? "admin" : "responder"}</span></div>
              <a href="/profile" role="menuitem"><i class="ti ti-user" aria-hidden="true"></i> Dossier</a>
              ${isAdmin ? '<a href="/admin" role="menuitem"><i class="ti ti-shield-lock" aria-hidden="true"></i> Sentinel Control</a>' : ""}
              <button id="logout-btn" role="menuitem"><i class="ti ti-logout" aria-hidden="true"></i> Log out</button>
            </div>
          </div>
        </div>
      </nav>
      <div id="broadcast-slot"></div>`;

    const btn = document.getElementById("menu-btn");
    const pop = document.getElementById("menu-pop");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = pop.classList.toggle("hidden");
      btn.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener("click", () => pop.classList.add("hidden"));
    document.getElementById("logout-btn").addEventListener("click", App.logout);

    App.loadBroadcast();
  };

  App.loadBroadcast = async function () {
    try {
      const b = await App.api("/api/announcements");
      if (!b || !b.message) return;
      if (localStorage.getItem("bc-dismissed") === String(b.id)) return;
      const slot = document.getElementById("broadcast-slot");
      if (!slot) return;
      const bar = document.createElement("div");
      bar.className = "broadcast";
      bar.innerHTML = `<span class="tag">SENTINEL BROADCAST</span><span class="msg"></span>
        <button class="close" aria-label="Dismiss">&times;</button>`;
      bar.querySelector(".msg").textContent = b.message;
      bar.querySelector(".close").addEventListener("click", () => {
        localStorage.setItem("bc-dismissed", String(b.id));
        bar.remove();
      });
      slot.appendChild(bar);
    } catch (e) { /* ignore */ }
  };

  window.App = App;
})();
