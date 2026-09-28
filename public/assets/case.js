/* Case-file page: evidence, endpoints, intel (hints), flag terminal */
(async function () {
  if (!(await App.guard())) return;
  await App.chrome("board");

  const DIFF_CLASS = {
    "Easy": "diff-easy", "Easy-Moderate": "diff-moderate", "Moderate": "diff-moderate",
    "Moderate-Hard": "diff-hard-mod", "Hard": "diff-hard"
  };
  const root = document.getElementById("case-root");
  const slug = new URLSearchParams(location.search).get("id");
  if (!slug) { root.innerHTML = '<div class="empty">No case specified.</div>'; return; }
  document.getElementById("crumb-id").textContent = slug.toUpperCase();

  let state = null;
  const cooldown = { until: 0 };

  async function load() {
    try {
      state = await App.api("/api/challenges?slug=" + encodeURIComponent(slug));
      render();
    } catch (e) {
      root.innerHTML = '<div class="empty">Could not load this case. ' + App.esc(e.message) + "</div>";
    }
  }

  function render() {
    const c = state.challenge;
    const diff = DIFF_CLASS[c.difficulty] || "diff-moderate";

    root.innerHTML = `
      <div class="card hud case-head" style="margin-bottom:24px">
        <span class="case-id">CASE ${App.esc(c.slug.toUpperCase())}</span>
        <h1 class="case-title">${App.esc(c.title)}</h1>
        <div class="meta-row">
          <span class="badge domain"><i class="ti ti-category" aria-hidden="true"></i>${App.esc(c.category)}</span>
          <span class="badge ${diff}"><i class="ti ti-flame" aria-hidden="true"></i>${App.esc(c.difficulty)}</span>
          <span class="badge points"><i class="ti ti-diamond" aria-hidden="true"></i>${c.points} pts</span>
          ${c.solved ? '<span class="badge solved"><i class="ti ti-shield-check" aria-hidden="true"></i>Neutralised</span>' : ""}
        </div>
      </div>
      <div class="case-grid">
        <div class="stack">
          <div class="card hud">
            <div class="card-title"><i class="ti ti-alert-triangle" aria-hidden="true"></i> Sentinel alert</div>
            <div class="prose" id="desc"></div>
          </div>
          ${renderEvidence()}
          ${renderEndpoints()}
        </div>
        <div class="stack">
          ${renderIntel()}
          ${renderTerminal()}
        </div>
      </div>`;

    document.getElementById("desc").innerHTML = App.mdSafe(c.description_md);
    wireEvidence();
    wireIntel();
    wireTerminal();
  }

  /* ---- evidence ---- */
  function renderEvidence() {
    if (!state.files || !state.files.length) return "";
    const rows = state.files.map((f) => `
      <div class="file-row">
        <i class="ti ti-file-download fi" aria-hidden="true"></i>
        <div class="fmeta">
          <div class="fname">${App.esc(f.display_name)}</div>
          <div class="fsub" title="${App.esc(f.sha256 || "")}">${App.fmtBytes(f.size_bytes)}${f.sha256 ? " · sha256 " + App.esc(f.sha256.slice(0, 16)) + "…" : ""}</div>
        </div>
        <div class="fact">
          ${f.sha256 ? `<button class="btn ghost copy-hash" data-hash="${App.esc(f.sha256)}" title="Copy SHA-256"><i class="ti ti-copy" aria-hidden="true"></i></button>` : ""}
          <button class="btn cyan dl" data-id="${App.esc(f.id)}"><i class="ti ti-download" aria-hidden="true"></i> Get</button>
        </div>
      </div>`).join("");
    return `<div class="card hud cyan">
      <div class="card-title"><i class="ti ti-folder" aria-hidden="true"></i> Evidence</div>
      <div class="evidence">${rows}</div></div>`;
  }
  function wireEvidence() {
    root.querySelectorAll(".copy-hash").forEach((b) => b.addEventListener("click", () => {
      navigator.clipboard.writeText(b.dataset.hash).then(() =>
        Sentinel.notify({ type: "info", title: "COPIED", message: "SHA-256 on clipboard.", duration: 1800 }));
    }));
    root.querySelectorAll(".dl").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const r = await App.api("/api/file?id=" + encodeURIComponent(b.dataset.id));
        window.open(r.url, "_blank", "noopener");
      } catch (e) {
        Sentinel.notify({ type: "bad", title: "DOWNLOAD FAILED", message: e.message });
      } finally { b.disabled = false; }
    }));
  }

  /* ---- endpoints ---- */
  function renderEndpoints() {
    if (!state.endpoints || !state.endpoints.length) return "";
    const rows = state.endpoints.map((e) => `
      <div class="endpoint ${e.kind === "backup" ? "backup" : ""}">
        <span class="dot ${e.status || ""}"></span>
        <div style="min-width:0">
          <div class="ep-label">${App.esc(e.label || (e.kind === "backup" ? "Backup" : "Primary"))}</div>
          <a class="ep-url" href="${App.esc(e.url)}" target="_blank" rel="noopener noreferrer">${App.esc(e.url)}</a>
          ${e.note ? `<div class="access-note">${App.esc(e.note)}</div>` : ""}
        </div>
        <a class="btn ghost" style="margin-left:auto" href="${App.esc(e.url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link" aria-hidden="true"></i></a>
      </div>`).join("");
    return `<div class="card hud">
      <div class="card-title"><i class="ti ti-plug-connected" aria-hidden="true"></i> Access links</div>
      <div class="evidence">${rows}</div>
      <div class="access-note">This target is behind Cloudflare Access. Sign in with your allowed email + one-time PIN in a browser, or use <code>cloudflared access curl</code> / <code>cloudflared access login</code> for command-line tools. In Burp, log in through the embedded browser.</div>
    </div>`;
  }

  /* ---- intel (hints) ---- */
  function renderIntel() {
    if (!state.hints || !state.hints.length) return "";
    const cards = state.hints.map((h, i) => {
      const prevLocked = i > 0 && !state.hints[i - 1].unlocked;
      const locked = !h.unlocked;
      const blocked = locked && prevLocked;
      return `<div class="intel-card ${locked ? "locked" : ""} ${blocked ? "blocked" : ""}" data-id="${h.id}">
        <div class="intel-head">
          <span class="n">INTEL #${h.position}</span>
          ${locked ? `<span class="cost">−${h.cost} pts</span>` : `<span class="cost" style="color:var(--ok);border-color:rgba(61,245,167,.4)">decrypted</span>`}
        </div>
        <div class="intel-body">${h.unlocked ? App.mdSafe(h.content_md) : ""}</div>
        <button class="btn block btn-intel" ${blocked ? "disabled" : ""} data-id="${h.id}" data-cost="${h.cost}">
          <i class="ti ti-lock-open" aria-hidden="true"></i> ${blocked ? "Decrypt previous intel first" : "Decrypt intel (−" + h.cost + " pts)"}
        </button>
      </div>`;
    }).join("");
    return `<div class="card hud">
      <div class="card-title"><i class="ti ti-bulb" aria-hidden="true"></i> Intel</div>
      <div class="intel">${cards}</div></div>`;
  }
  function wireIntel() {
    root.querySelectorAll(".btn-intel").forEach((b) => b.addEventListener("click", async () => {
      if (b.disabled) return;
      const cost = b.dataset.cost;
      const ok = await Sentinel.confirm({
        title: "Decrypt this intel?",
        message: "This deducts " + cost + " points from your score. It can't be undone.",
        confirmText: "Decrypt −" + cost, icon: "ti-lock-open"
      });
      if (!ok) return;
      b.disabled = true;
      try {
        const r = await App.api("/api/hint-unlock", { method: "POST", body: { hint_id: b.dataset.id } });
        const hint = state.hints.find((h) => String(h.id) === String(b.dataset.id));
        hint.unlocked = true; hint.content_md = r.content_md;
        if (r.score != null) App.animateScore(r.score);
        Sentinel.notify({ type: "warn", title: "INTEL DECRYPTED", message: "−" + cost + " points", icon: "ti-lock-open" });
        render();
      } catch (e) {
        b.disabled = false;
        Sentinel.notify({ type: "bad", title: "DECRYPT FAILED", message: e.message });
      }
    }));
  }

  /* ---- flag terminal ---- */
  function renderTerminal() {
    if (state.challenge.solved) {
      return `<div class="card hud">
        <div class="card-title"><i class="ti ti-flag" aria-hidden="true"></i> Flag terminal</div>
        <div class="solved-stamp"><i class="ti ti-shield-check" aria-hidden="true"></i> Neutralised</div>
        <div class="access-note" style="text-align:center">You have already closed this case. Nice work, responder.</div>
      </div>`;
    }
    return `<div class="card hud">
      <div class="card-title"><i class="ti ti-flag" aria-hidden="true"></i> Flag terminal</div>
      <div class="terminal">
        <div class="terminal-bar"><span class="lights"><i></i><i></i><i></i></span> flag-submit</div>
        <div class="terminal-body">
          <div class="prompt-line"><span class="path">responder@sentinel</span>:~$ submit</div>
          <form id="flag-form">
            <div class="flag-field" id="flag-field">
              <span class="flag-affix">Eclipse{</span>
              <input type="text" id="flag-input" autocomplete="off" spellcheck="false"
                     aria-label="Flag content" placeholder="paste the recovered string" />
              <span class="flag-affix">}</span>
            </div>
            <div class="submit-row">
              <button type="submit" class="btn primary" id="flag-submit"><i class="ti ti-send" aria-hidden="true"></i> Transmit</button>
              <span class="attempts" id="attempts"></span>
            </div>
          </form>
          <div class="recent" id="recent"></div>
        </div>
      </div>
    </div>`;
  }

  function wireTerminal() {
    const form = document.getElementById("flag-form");
    if (!form) return;
    renderRecent();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (Date.now() < cooldown.until) return;
      const input = document.getElementById("flag-input");
      const field = document.getElementById("flag-field");
      let val = input.value.trim();
      if (!val) { field.classList.add("shake"); setTimeout(() => field.classList.remove("shake"), 400); return; }
      // accept a full flag paste too
      val = val.replace(/^Eclipse\{/i, "").replace(/\}$/, "");
      const flag = "Eclipse{" + val + "}";

      const btn = document.getElementById("flag-submit");
      btn.disabled = true;
      try {
        const r = await App.api("/api/submit", { method: "POST", body: { slug: slug, flag: flag } });
        if (r.rate_limited) {
          startCooldown(r.retry_after || 30, btn);
          Sentinel.notify({ type: "warn", title: "COOLDOWN", message: "Too many attempts. Wait " + (r.retry_after || 30) + "s." });
          return;
        }
        if (r.already) {
          Sentinel.notify({ type: "info", title: "CASE CLOSED", message: "You already neutralised this threat." });
          btn.disabled = false; return;
        }
        if (r.correct) {
          onCorrect(r);
        } else {
          onWrong(r, field, input);
          btn.disabled = false;
        }
      } catch (err) {
        Sentinel.notify({ type: "bad", title: "TRANSMIT FAILED", message: err.message });
        btn.disabled = false;
      }
    });
  }

  function onCorrect(r) {
    if (typeof confetti === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#3DF5A7", "#FFB547", "#38E1FF"] });
    }
    Sentinel.notify({ type: "ok", title: "FLAG ACCEPTED", message: "+" + (r.points_awarded || 0) + " points" });
    if (r.score != null) App.animateScore(r.score);
    state.challenge.solved = true;
    setTimeout(render, 900);
  }

  function onWrong(r, field, input) {
    field.classList.add("shake");
    setTimeout(() => field.classList.remove("shake"), 400);
    if (r.decoy) {
      Sentinel.notify({ type: "warn", title: "DECOY DETECTED", message: "Sentinel flags this as a decoy planted by The Eclipse.", icon: "ti-urgent" });
    } else {
      const left = r.attempts_left == null ? "" : r.attempts_left + " attempts left this minute";
      Sentinel.notify({ type: "bad", title: "FLAG REJECTED", message: left });
    }
    if (r.attempts_left != null) updateAttempts(r.attempts_left);
    state.attempts_recent = state.attempts_recent || [];
    state.attempts_recent.unshift({ is_correct: false, created_at: new Date().toISOString() });
    renderRecent();
    input.select();
  }

  function updateAttempts(left) {
    const a = document.getElementById("attempts");
    if (a) a.innerHTML = "Attempts left this minute: <b>" + left + "/5</b>";
  }

  function startCooldown(seconds, btn) {
    cooldown.until = Date.now() + seconds * 1000;
    let remaining = seconds;
    btn.disabled = true;
    const label = btn.innerHTML;
    const tick = () => {
      remaining--;
      btn.innerHTML = '<span class="ring" style="--p:' + Math.round((1 - remaining / seconds) * 100) + '"></span> ' + remaining + "s";
      if (remaining <= 0) { clearInterval(t); btn.disabled = false; btn.innerHTML = label; }
    };
    btn.innerHTML = '<span class="ring"></span> ' + remaining + "s";
    const t = setInterval(tick, 1000);
  }

  function renderRecent() {
    const box = document.getElementById("recent");
    if (!box) return;
    const items = (state.attempts_recent || []).slice(0, 5);
    updateAttempts(state.attempts_left == null ? 5 : state.attempts_left);
    box.innerHTML = items.map((a) => {
      const t = new Date(a.created_at).toLocaleTimeString();
      return `<div class="r ${a.is_correct ? "ok" : "no"}"><i class="ti ${a.is_correct ? "ti-check" : "ti-x"}" aria-hidden="true"></i> ${a.is_correct ? "accepted" : "rejected"} · ${App.esc(t)}</div>`;
    }).join("");
  }

  load();
})();
