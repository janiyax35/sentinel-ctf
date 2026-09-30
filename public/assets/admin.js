/* Sentinel Control — admin console (tabbed).
   All privileged operations are re-checked on the server (/api/admin). */
(async function () {
  if (!(await App.guard({ admin: true }))) return;
  await App.chrome("admin");

  const TABS = [
    ["overview", "Overview", "ti-dashboard"],
    ["challenges", "Challenges", "ti-flag"],
    ["hints", "Intel", "ti-bulb"],
    ["files", "Evidence", "ti-folder"],
    ["endpoints", "Access links", "ti-plug-connected"],
    ["users", "Responders", "ti-users"],
    ["submissions", "Audit log", "ti-history"],
    ["broadcasts", "Broadcast", "ti-speakerphone"]
  ];
  const tabsEl = document.getElementById("tabs");
  const panel = document.getElementById("panel");
  let current = location.hash.replace("#", "") || "overview";
  let challengeCache = [];

  tabsEl.innerHTML = TABS.map(([k, label, icon]) =>
    `<button data-k="${k}"><i class="ti ${icon}" aria-hidden="true"></i> ${label}</button>`).join("");
  tabsEl.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => { current = b.dataset.k; location.hash = current; renderTab(); }));

  function setActive() {
    tabsEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.k === current));
  }
  function loading() { panel.innerHTML = '<div class="spinner"></div>'; }
  function fail(e) { panel.innerHTML = '<div class="empty">Error: ' + App.esc(e.message) + "</div>"; }

  async function adminGet(resource, params) {
    const q = new URLSearchParams(Object.assign({ resource }, params || {})).toString();
    return App.api("/api/admin?" + q);
  }
  async function adminPost(body) {
    return App.api("/api/admin", { method: "POST", body });
  }
  async function loadChallenges() {
    if (!challengeCache.length) {
      const r = await adminGet("challenges");
      challengeCache = r.challenges || [];
    }
    return challengeCache;
  }

  /* ---------- input modal helper ---------- */
  function formModal(title, fields, submitLabel) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.style.maxWidth = "480px";
      modal.innerHTML = `<div class="mh"><i class="ti ti-adjustments" aria-hidden="true"></i><h3>${App.esc(title)}</h3></div>
        <form id="fm"></form>
        <div class="mact"><button class="btn ghost" type="button" id="fc">Cancel</button>
          <button class="btn primary" type="submit" form="fm">${App.esc(submitLabel || "Save")}</button></div>`;
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      const form = modal.querySelector("#fm");
      form.innerHTML = fields.map((f) => {
        const id = "f_" + f.name;
        if (f.type === "textarea")
          return `<div class="field"><label for="${id}">${App.esc(f.label)}</label><textarea id="${id}" name="${f.name}">${App.esc(f.value || "")}</textarea></div>`;
        if (f.type === "select")
          return `<div class="field"><label for="${id}">${App.esc(f.label)}</label><select id="${id}" name="${f.name}">${f.options.map((o) => `<option value="${App.esc(o.value)}" ${o.value === f.value ? "selected" : ""}>${App.esc(o.label)}</option>`).join("")}</select></div>`;
        return `<div class="field"><label for="${id}">${App.esc(f.label)}</label><input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${App.esc(f.value == null ? "" : f.value)}" ${f.required ? "required" : ""} placeholder="${App.esc(f.placeholder || "")}" /></div>`;
      }).join("");
      function close(val) { backdrop.remove(); resolve(val); }
      modal.querySelector("#fc").addEventListener("click", () => close(null));
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const out = {};
        fields.forEach((f) => { out[f.name] = form.elements[f.name].value; });
        close(out);
      });
      const first = form.querySelector("input,textarea,select");
      if (first) first.focus();
    });
  }

  /* ---------- tabs ---------- */
  async function renderTab() {
    setActive();
    loading();
    try {
      if (current === "overview") return renderOverview();
      if (current === "challenges") return renderChallenges();
      if (current === "hints") return renderHints();
      if (current === "files") return renderFiles();
      if (current === "endpoints") return renderEndpoints();
      if (current === "users") return renderUsers();
      if (current === "submissions") return renderSubmissions();
      if (current === "broadcasts") return renderBroadcasts();
    } catch (e) { fail(e); }
  }

  async function renderOverview() {
    const r = await adminGet("stats");
    const s = r.stats || {};
    panel.innerHTML = `
      <div class="hud-bar">
        <div class="stat"><div class="k">Responders</div><div class="v cyan">${s.users || 0}</div></div>
        <div class="stat"><div class="k">Total solves</div><div class="v amber">${s.solves || 0}</div></div>
        <div class="stat"><div class="k">Submissions</div><div class="v">${s.submissions || 0}</div></div>
        <div class="stat"><div class="k">Wrong (1h)</div><div class="v" style="color:var(--bad)">${s.wrong_last_hour || 0}</div></div>
      </div>
      <div class="card hud">
        <div class="card-title"><i class="ti ti-chart-bar" aria-hidden="true"></i> Solves per case</div>
        <table class="admin-table"><thead><tr><th>Case</th><th>Solves</th></tr></thead><tbody>
          ${(s.per_challenge || []).map((c) => `<tr><td>${App.esc(c.slug.toUpperCase())} — ${App.esc(c.title)}</td><td>${c.solves}</td></tr>`).join("") || '<tr><td colspan="2"><div class="empty">No data</div></td></tr>'}
        </tbody></table>
      </div>`;
  }

  async function renderChallenges() {
    const list = await (async () => { challengeCache = []; return loadChallenges(); })();
    panel.innerHTML = `
      <div style="margin-bottom:14px"><button class="btn violet" id="add-ch"><i class="ti ti-plus" aria-hidden="true"></i> New case</button></div>
      <div class="card hud violet"><table class="admin-table">
        <thead><tr><th>Slug</th><th>Title</th><th>Category</th><th>Diff</th><th>Points</th><th>Flag</th><th>Visible</th><th></th></tr></thead>
        <tbody>${list.map((c) => `
          <tr>
            <td class="mono">${App.esc(c.slug)}</td>
            <td>${App.esc(c.title)}</td>
            <td>${App.esc(c.category)}</td>
            <td>${App.esc(c.difficulty)}</td>
            <td>${c.points}</td>
            <td>${c.has_flag ? '<span class="admin-badge" style="color:var(--ok)">set</span>' : '<span class="admin-badge" style="color:var(--bad)">none</span>'}</td>
            <td>${c.is_visible ? '<span class="admin-badge" style="color:var(--ok)">yes</span>' : '<span class="admin-badge">hidden</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost ed" data-id="${c.id}" title="Edit"><i class="ti ti-edit" aria-hidden="true"></i></button>
              <button class="btn ghost flag" data-id="${c.id}" data-cs="${c.case_sensitive}" title="Set flag"><i class="ti ti-key" aria-hidden="true"></i></button>
              <button class="btn ghost vis" data-id="${c.id}" data-v="${c.is_visible ? 1 : 0}" title="Toggle visibility"><i class="ti ti-eye" aria-hidden="true"></i></button>
            </td>
          </tr>`).join("") || '<tr><td colspan="8"><div class="empty">No cases</div></td></tr>'}
        </tbody></table></div>`;

    document.getElementById("add-ch").addEventListener("click", () => editChallenge(null));
    panel.querySelectorAll(".ed").forEach((b) => b.addEventListener("click", () =>
      editChallenge(list.find((c) => String(c.id) === b.dataset.id))));
    panel.querySelectorAll(".flag").forEach((b) => b.addEventListener("click", async () => {
      const v = await formModal("Set flag", [{ name: "flag", label: "Plaintext flag (stored only as HMAC)", required: true, placeholder: "Eclipse{...}" }], "Store flag");
      if (!v) return;
      try {
        await adminPost({ resource: "challenges", action: "set_flag", id: b.dataset.id, flag: v.flag });
        Sentinel.notify({ type: "ok", title: "SAVED", message: "Flag stored as HMAC." });
        challengeCache = []; renderChallenges();
      } catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".vis").forEach((b) => b.addEventListener("click", async () => {
      try {
        await adminPost({ resource: "challenges", action: "update", id: b.dataset.id, is_visible: b.dataset.v !== "1" });
        challengeCache = []; renderChallenges();
      } catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
  }

  async function editChallenge(c) {
    const v = await formModal(c ? "Edit case" : "New case", [
      { name: "slug", label: "Slug", value: c ? c.slug : "", required: true, placeholder: "steg-01" },
      { name: "stage_no", label: "Stage number", type: "number", value: c ? c.stage_no : "" },
      { name: "title", label: "Title", value: c ? c.title : "", required: true },
      { name: "category", label: "Category", value: c ? c.category : "", placeholder: "Web" },
      { name: "difficulty", label: "Difficulty", type: "select", value: c ? c.difficulty : "Easy",
        options: ["Easy", "Easy-Moderate", "Moderate", "Moderate-Hard", "Hard"].map((x) => ({ value: x, label: x })) },
      { name: "points", label: "Points", type: "number", value: c ? c.points : 100, required: true },
      { name: "case_sensitive", label: "Case sensitive flag", type: "select", value: c ? String(c.case_sensitive) : "true",
        options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { name: "description_md", label: "Description (markdown)", type: "textarea", value: c ? c.description_md || "" : "" }
    ], "Save case");
    if (!v) return;
    v.points = parseInt(v.points, 10);
    v.stage_no = v.stage_no ? parseInt(v.stage_no, 10) : null;
    v.case_sensitive = v.case_sensitive === "true";
    try {
      await adminPost(Object.assign({ resource: "challenges", action: c ? "update" : "create", id: c ? c.id : undefined }, v));
      Sentinel.notify({ type: "ok", title: "SAVED" });
      challengeCache = []; renderChallenges();
    } catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
  }

  async function renderHints() {
    const chs = await loadChallenges();
    const r = await adminGet("hints");
    const hints = r.hints || [];
    panel.innerHTML = chs.map((c) => {
      const hs = hints.filter((h) => String(h.challenge_id) === String(c.id)).sort((a, b) => a.position - b.position);
      return `<div class="card hud" style="margin-bottom:16px">
        <div class="card-title"><i class="ti ti-bulb" aria-hidden="true"></i> ${App.esc(c.slug.toUpperCase())} — ${App.esc(c.title)}
          <button class="btn ghost aside add-hint" data-ch="${c.id}" data-pos="${hs.length + 1}"><i class="ti ti-plus" aria-hidden="true"></i> Add intel</button></div>
        <table class="admin-table"><thead><tr><th>#</th><th>Cost</th><th>Content</th><th></th></tr></thead><tbody>
          ${hs.map((h) => `<tr>
            <td>${h.position}</td><td>${h.cost}</td>
            <td style="max-width:340px">${App.esc((h.content_md || "").slice(0, 120))}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost eh" data-id="${h.id}" data-ch="${c.id}" data-pos="${h.position}" data-cost="${h.cost}" data-content="${App.esc(h.content_md || "")}"><i class="ti ti-edit" aria-hidden="true"></i></button>
              <button class="btn ghost dh" data-id="${h.id}"><i class="ti ti-trash" aria-hidden="true"></i></button>
            </td></tr>`).join("") || '<tr><td colspan="4"><div class="empty">No intel yet</div></td></tr>'}
        </tbody></table></div>`;
    }).join("") || '<div class="empty">Create a case first.</div>';

    panel.querySelectorAll(".add-hint").forEach((b) => b.addEventListener("click", () =>
      editHint({ challenge_id: b.dataset.ch, position: b.dataset.pos })));
    panel.querySelectorAll(".eh").forEach((b) => b.addEventListener("click", () =>
      editHint({ id: b.dataset.id, challenge_id: b.dataset.ch, position: b.dataset.pos, cost: b.dataset.cost, content_md: b.dataset.content })));
    panel.querySelectorAll(".dh").forEach((b) => b.addEventListener("click", async () => {
      if (!(await Sentinel.confirm({ title: "Delete this intel?", danger: true, confirmText: "Delete" }))) return;
      try { await adminPost({ resource: "hints", action: "delete", id: b.dataset.id }); renderHints(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
  }

  async function editHint(h) {
    const v = await formModal(h.id ? "Edit intel" : "Add intel", [
      { name: "position", label: "Position", type: "number", value: h.position || 1, required: true },
      { name: "cost", label: "Point cost", type: "number", value: h.cost || 10, required: true },
      { name: "content_md", label: "Content (markdown)", type: "textarea", value: h.content_md || "" }
    ], "Save intel");
    if (!v) return;
    v.position = parseInt(v.position, 10); v.cost = parseInt(v.cost, 10);
    try {
      await adminPost(Object.assign({ resource: "hints", action: h.id ? "update" : "create", id: h.id, challenge_id: h.challenge_id }, v));
      Sentinel.notify({ type: "ok", title: "SAVED" });
      renderHints();
    } catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
  }

  async function renderFiles() {
    const chs = await loadChallenges();
    const r = await adminGet("files");
    const files = r.files || [];
    panel.innerHTML = `<div class="access-note" style="margin-bottom:14px">Upload evidence files to the Supabase Storage bucket, then register them here so responders get authenticated, signed download links. Never register generator or solver scripts.</div>` +
      chs.map((c) => {
        const fs = files.filter((f) => String(f.challenge_id) === String(c.id));
        return `<div class="card hud cyan" style="margin-bottom:16px">
          <div class="card-title"><i class="ti ti-folder" aria-hidden="true"></i> ${App.esc(c.slug.toUpperCase())}
            <button class="btn ghost aside add-file" data-ch="${c.id}"><i class="ti ti-plus" aria-hidden="true"></i> Register file</button></div>
          <table class="admin-table"><thead><tr><th>Name</th><th>Storage path</th><th>Size</th><th>SHA-256</th><th></th></tr></thead><tbody>
            ${fs.map((f) => `<tr><td>${App.esc(f.display_name)}</td><td class="mono">${App.esc(f.storage_path)}</td>
              <td>${App.fmtBytes(f.size_bytes)}</td><td class="mono">${App.esc((f.sha256 || "").slice(0, 12))}…</td>
              <td><button class="btn ghost df" data-id="${f.id}"><i class="ti ti-trash" aria-hidden="true"></i></button></td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">No files</div></td></tr>'}
          </tbody></table></div>`;
      }).join("");

    panel.querySelectorAll(".add-file").forEach((b) => b.addEventListener("click", async () => {
      const v = await formModal("Register evidence file", [
        { name: "display_name", label: "Display name", required: true, placeholder: "signal_alpha.wav" },
        { name: "storage_path", label: "Storage path in bucket", required: true, placeholder: "steg-01/signal_alpha.wav" },
        { name: "size_bytes", label: "Size in bytes", type: "number" },
        { name: "sha256", label: "SHA-256 (optional)" }
      ], "Register");
      if (!v) return;
      v.size_bytes = v.size_bytes ? parseInt(v.size_bytes, 10) : null;
      try { await adminPost(Object.assign({ resource: "files", action: "create", challenge_id: b.dataset.ch }, v)); renderFiles(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".df").forEach((b) => b.addEventListener("click", async () => {
      if (!(await Sentinel.confirm({ title: "Unregister this file?", danger: true, confirmText: "Delete" }))) return;
      try { await adminPost({ resource: "files", action: "delete", id: b.dataset.id }); renderFiles(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
  }

  async function renderEndpoints() {
    const chs = await loadChallenges();
    const r = await adminGet("endpoints");
    const eps = r.endpoints || [];
    panel.innerHTML = chs.map((c) => {
      const es = eps.filter((e) => String(e.challenge_id) === String(c.id));
      return `<div class="card hud" style="margin-bottom:16px">
        <div class="card-title"><i class="ti ti-plug-connected" aria-hidden="true"></i> ${App.esc(c.slug.toUpperCase())}
          <button class="btn ghost aside add-ep" data-ch="${c.id}"><i class="ti ti-plus" aria-hidden="true"></i> Add link</button></div>
        <table class="admin-table"><thead><tr><th>Label</th><th>URL</th><th>Kind</th><th>Active</th><th></th></tr></thead><tbody>
          ${es.map((e) => `<tr><td>${App.esc(e.label)}</td><td class="mono" style="max-width:280px;word-break:break-all">${App.esc(e.url)}</td>
            <td>${App.esc(e.kind)}</td><td>${e.is_active ? '<span class="admin-badge" style="color:var(--ok)">on</span>' : '<span class="admin-badge">off</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost te" data-id="${e.id}" data-a="${e.is_active ? 1 : 0}" title="Toggle"><i class="ti ti-power" aria-hidden="true"></i></button>
              <button class="btn ghost de" data-id="${e.id}"><i class="ti ti-trash" aria-hidden="true"></i></button>
            </td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">No links</div></td></tr>'}
        </tbody></table></div>`;
    }).join("");

    panel.querySelectorAll(".add-ep").forEach((b) => b.addEventListener("click", async () => {
      const v = await formModal("Add access link", [
        { name: "label", label: "Label", value: "Primary", required: true },
        { name: "url", label: "URL (http/https only)", required: true, placeholder: "https://web03.example.com" },
        { name: "kind", label: "Kind", type: "select", value: "primary", options: [{ value: "primary", label: "primary" }, { value: "backup", label: "backup" }] },
        { name: "note", label: "Note (optional)", placeholder: "Use this if the primary link is down" }
      ], "Add");
      if (!v) return;
      if (!/^https?:\/\//i.test(v.url)) { Sentinel.notify({ type: "bad", title: "INVALID URL", message: "Only http/https links are allowed." }); return; }
      try { await adminPost(Object.assign({ resource: "endpoints", action: "create", challenge_id: b.dataset.ch, is_active: true }, v)); renderEndpoints(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".te").forEach((b) => b.addEventListener("click", async () => {
      try { await adminPost({ resource: "endpoints", action: "update", id: b.dataset.id, is_active: b.dataset.a !== "1" });
        Sentinel.notify({ type: "info", title: "ROUTE UPDATED" }); renderEndpoints(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".de").forEach((b) => b.addEventListener("click", async () => {
      if (!(await Sentinel.confirm({ title: "Delete this link?", danger: true, confirmText: "Delete" }))) return;
      try { await adminPost({ resource: "endpoints", action: "delete", id: b.dataset.id }); renderEndpoints(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
  }

  async function renderUsers() {
    const r = await adminGet("users");
    const users = r.users || [];
    const meId = (App.me && App.me.id) ? String(App.me.id) : "";
    panel.innerHTML = `<div style="margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn violet" id="add-user"><i class="ti ti-user-plus" aria-hidden="true"></i> Create responder</button>
      </div>
      <div class="access-note" style="margin-bottom:14px"><b>Edit</b> changes name, email or password (manual reset). <b>Ban</b> blocks login and removes from the board. <b>Hide</b> only removes from the board. <b>Reset score</b> wipes one responder's solves and intel. <b>Delete</b> permanently removes the account and all its data. Actions on your own account are disabled.</div>
      <div class="card hud violet"><table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Board</th><th></th></tr></thead><tbody>
        ${users.map((u) => {
          const self = String(u.id) === meId;
          return `<tr>
          <td>${App.esc(u.display_name || "")}${self ? ' <span class="admin-badge" style="color:var(--telemetry)">you</span>' : ""}</td><td class="mono">${App.esc(u.email || "")}</td>
          <td>${App.esc(u.role)}</td>
          <td>${u.is_disabled ? '<span class="admin-badge" style="color:var(--bad)">banned</span>' : '<span class="admin-badge" style="color:var(--ok)">active</span>'}</td>
          <td>${u.hidden_from_board ? '<span class="admin-badge" style="color:var(--warn)">hidden</span>' : '<span class="admin-badge">shown</span>'}</td>
          <td style="white-space:nowrap">
            <button class="btn ghost eu" data-id="${u.id}" data-name="${App.esc(u.display_name || "")}" data-email="${App.esc(u.email || "")}" title="Edit details"><i class="ti ti-user-edit" aria-hidden="true"></i></button>
            ${self ? "" : `
            <button class="btn ghost tu" data-id="${u.id}" data-d="${u.is_disabled ? 1 : 0}" title="${u.is_disabled ? "Unban" : "Ban"}"><i class="ti ${u.is_disabled ? "ti-lock-open" : "ti-ban"}" aria-hidden="true"></i></button>
            <button class="btn ghost hb" data-id="${u.id}" data-h="${u.hidden_from_board ? 1 : 0}" title="${u.hidden_from_board ? "Show on board" : "Hide from board"}"><i class="ti ${u.hidden_from_board ? "ti-eye" : "ti-eye-off"}" aria-hidden="true"></i></button>
            <button class="btn ghost rs" data-id="${u.id}" data-name="${App.esc(u.display_name || "")}" title="Reset score"><i class="ti ti-restore" aria-hidden="true"></i></button>
            <button class="btn ghost ru" data-id="${u.id}" data-role="${u.role}" title="Toggle admin"><i class="ti ti-shield" aria-hidden="true"></i></button>
            <button class="btn ghost du" data-id="${u.id}" data-name="${App.esc(u.display_name || "")}" title="Delete responder" style="color:var(--bad)"><i class="ti ti-trash" aria-hidden="true"></i></button>`}
          </td></tr>`;
        }).join("") || '<tr><td colspan="6"><div class="empty">No responders</div></td></tr>'}
      </tbody></table></div>

      <div class="card hud" style="margin-top:20px;border-color:var(--bad)">
        <div class="card-title" style="color:var(--bad)"><i class="ti ti-alert-triangle" aria-hidden="true"></i> Testing &amp; reset</div>
        <div class="access-note" style="margin-bottom:12px">Use these when preparing the platform. <b>Clear audit log</b> deletes every submission but keeps scores. <b>Reset leaderboard</b> deletes all solves and intel but keeps the audit log. <b>Full reset</b> clears everything for a fresh start. Accounts, challenges, flags, hints, files and links are never touched.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ghost" id="clear-audit"><i class="ti ti-eraser" aria-hidden="true"></i> Clear audit log</button>
          <button class="btn danger" id="reset-board"><i class="ti ti-refresh-alert" aria-hidden="true"></i> Reset leaderboard</button>
          <button class="btn danger" id="full-reset"><i class="ti ti-flame" aria-hidden="true"></i> Full reset (fresh start)</button>
        </div>
      </div>`;

    document.getElementById("add-user").addEventListener("click", async () => {
      const v = await formModal("Create responder", [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "display_name", label: "Display name", required: true },
        { name: "password", label: "Temporary passphrase", required: true },
        { name: "role", label: "Role", type: "select", value: "player", options: [{ value: "player", label: "player" }, { value: "admin", label: "admin" }] }
      ], "Create");
      if (!v) return;
      try { await adminPost(Object.assign({ resource: "users", action: "create" }, v));
        Sentinel.notify({ type: "ok", title: "RESPONDER CREATED" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });

    document.getElementById("clear-audit").addEventListener("click", async () => {
      const ok = await Sentinel.confirm({
        title: "Clear the audit log?",
        message: "Deletes every submission record from every responder. Scores (solves and intel) are kept. This cannot be undone.",
        danger: true, confirmText: "Clear audit log", icon: "ti-eraser"
      });
      if (!ok) return;
      try { await adminPost({ resource: "submissions", action: "clear" });
        Sentinel.notify({ type: "ok", title: "AUDIT LOG CLEARED" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });

    document.getElementById("reset-board").addEventListener("click", async () => {
      const ok = await Sentinel.confirm({
        title: "Reset the entire leaderboard?",
        message: "This deletes every solve and unlocked intel for all responders, setting all scores to zero. The audit log, accounts, challenges, flags and hints are kept. This cannot be undone.",
        danger: true, confirmText: "Reset leaderboard", icon: "ti-refresh-alert"
      });
      if (!ok) return;
      try { await adminPost({ resource: "leaderboard", action: "reset" });
        Sentinel.notify({ type: "ok", title: "LEADERBOARD RESET", message: "All scores cleared." }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });

    document.getElementById("full-reset").addEventListener("click", async () => {
      const ok = await Sentinel.confirm({
        title: "Full reset for a fresh start?",
        message: "This clears ALL scores AND the entire audit log for every responder. Accounts, challenges, flags, hints, files and links are kept. Use this after testing, before the event. This cannot be undone.",
        danger: true, confirmText: "Wipe everything", icon: "ti-flame"
      });
      if (!ok) return;
      try { await adminPost({ resource: "leaderboard", action: "full_reset" });
        Sentinel.notify({ type: "ok", title: "PLATFORM RESET", message: "Scores and audit log cleared. Fresh start ready." }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });

    panel.querySelectorAll(".eu").forEach((b) => b.addEventListener("click", () =>
      editUserDetails({ id: b.dataset.id, display_name: b.dataset.name, email: b.dataset.email })));
    panel.querySelectorAll(".tu").forEach((b) => b.addEventListener("click", async () => {
      const banning = b.dataset.d !== "1";
      if (banning && !(await Sentinel.confirm({ title: "Ban this responder?", message: "They will be logged out, blocked from the platform, and removed from the leaderboard.", danger: true, confirmText: "Ban" }))) return;
      try { await adminPost({ resource: "users", action: "update", id: b.dataset.id, is_disabled: banning });
        Sentinel.notify({ type: banning ? "warn" : "ok", title: banning ? "RESPONDER BANNED" : "RESPONDER REINSTATED" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".hb").forEach((b) => b.addEventListener("click", async () => {
      try { await adminPost({ resource: "users", action: "update", id: b.dataset.id, hidden_from_board: b.dataset.h !== "1" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".rs").forEach((b) => b.addEventListener("click", async () => {
      if (!(await Sentinel.confirm({ title: "Reset this responder's score?", message: "Deletes all solves and unlocked intel for " + (b.dataset.name || "this responder") + ". Their account stays active.", danger: true, confirmText: "Reset score" }))) return;
      try { await adminPost({ resource: "users", action: "reset_score", id: b.dataset.id });
        Sentinel.notify({ type: "ok", title: "SCORE RESET" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".ru").forEach((b) => b.addEventListener("click", async () => {
      const next = b.dataset.role === "admin" ? "player" : "admin";
      if (!(await Sentinel.confirm({ title: "Change role to " + next + "?", confirmText: "Change" }))) return;
      try { await adminPost({ resource: "users", action: "update", id: b.dataset.id, role: next }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
    panel.querySelectorAll(".du").forEach((b) => b.addEventListener("click", async () => {
      const name = b.dataset.name || "this responder";
      const v = await formModal("Delete " + name + "?", [
        { name: "confirm", label: 'This permanently removes the account and ALL its data (solves, intel, submissions). It cannot be undone. Type the display name "' + name + '" to confirm.', required: true, placeholder: name }
      ], "Delete permanently");
      if (!v) return;
      if (String(v.confirm).trim() !== name) { Sentinel.notify({ type: "bad", title: "NAME DID NOT MATCH", message: "Deletion cancelled." }); return; }
      try { await adminPost({ resource: "users", action: "delete", id: b.dataset.id });
        Sentinel.notify({ type: "ok", title: "RESPONDER DELETED" }); renderUsers(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    }));
  }

  /* ---------- edit user details (name / email / password) ---------- */
  function editUserDetails(u) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.style.maxWidth = "480px";
      modal.innerHTML = `<div class="mh"><i class="ti ti-user-edit" aria-hidden="true"></i><h3>Edit responder</h3></div>
        <form id="eu-form">
          <div class="field"><label for="eu-name">Display name</label>
            <input id="eu-name" type="text" value="${App.esc(u.display_name || "")}" required /></div>
          <div style="border:1px solid var(--bad);border-radius:10px;padding:12px;margin-top:6px">
            <div class="access-note" style="color:var(--bad);margin-bottom:10px"><i class="ti ti-alert-triangle" aria-hidden="true"></i> Danger area — these change how the responder signs in.</div>
            <div class="field"><label for="eu-email">Login email</label>
              <input id="eu-email" type="email" value="${App.esc(u.email || "")}" /></div>
            <div class="field" style="margin-bottom:0"><label for="eu-pw">New password (manual reset)</label>
              <input id="eu-pw" type="text" autocomplete="off" placeholder="Leave blank to keep current password" /></div>
          </div>
        </form>
        <div class="mact"><button class="btn ghost" type="button" id="eu-cancel">Cancel</button>
          <button class="btn primary" type="submit" form="eu-form">Save changes</button></div>`;
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      const form = modal.querySelector("#eu-form");
      function close(v) { backdrop.remove(); resolve(v); }
      modal.querySelector("#eu-cancel").addEventListener("click", () => close(null));
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = form.querySelector("#eu-name").value.trim();
        const email = form.querySelector("#eu-email").value.trim();
        const pw = form.querySelector("#eu-pw").value;
        const origName = (u.display_name || "").trim();
        const origEmail = (u.email || "").trim();
        if (!name) { Sentinel.notify({ type: "bad", title: "NAME REQUIRED" }); return; }
        if (pw && pw.length < 8) { Sentinel.notify({ type: "bad", title: "PASSWORD TOO SHORT", message: "Use at least 8 characters." }); return; }
        const btn = modal.querySelector('button[form="eu-form"]');
        btn.disabled = true;
        try {
          let did = false;
          if (name !== origName) { await adminPost({ resource: "users", action: "update", id: u.id, display_name: name }); did = true; }
          if (email && email !== origEmail) { await adminPost({ resource: "users", action: "set_email", id: u.id, email: email }); did = true; }
          if (pw) { await adminPost({ resource: "users", action: "set_password", id: u.id, password: pw }); did = true; }
          close(true);
          Sentinel.notify({ type: did ? "ok" : "info", title: did ? "RESPONDER UPDATED" : "NO CHANGES" });
          renderUsers();
        } catch (err) {
          btn.disabled = false;
          Sentinel.notify({ type: "bad", title: "FAILED", message: err.message });
        }
      });
      const first = form.querySelector("#eu-name");
      if (first) first.focus();
    });
  }

  async function renderSubmissions() {
    const r = await adminGet("submissions", { limit: 100 });
    const subs = r.submissions || [];
    panel.innerHTML = `<div class="card hud"><table class="admin-table">
      <thead><tr><th>Time</th><th>Responder</th><th>Case</th><th>Result</th><th>Submitted (wrong only)</th><th>IP</th></tr></thead><tbody>
      ${subs.map((s) => `<tr>
        <td>${new Date(s.created_at).toLocaleString()}</td>
        <td>${App.esc(s.display_name || "")}</td>
        <td class="mono">${App.esc(s.slug || "")}</td>
        <td>${s.is_correct ? '<span class="admin-badge" style="color:var(--ok)">correct</span>' : '<span class="admin-badge" style="color:var(--bad)">wrong</span>'}</td>
        <td class="mono" style="max-width:240px;overflow:hidden;text-overflow:ellipsis">${App.esc(s.submitted_text || "")}</td>
        <td class="mono">${App.esc(s.ip || "")}</td></tr>`).join("") || '<tr><td colspan="6"><div class="empty">No submissions</div></td></tr>'}
    </tbody></table></div>`;
  }

  async function renderBroadcasts() {
    const r = await adminGet("broadcasts");
    const active = r.active;
    panel.innerHTML = `
      <div class="card hud" style="margin-bottom:16px">
        <div class="card-title"><i class="ti ti-speakerphone" aria-hidden="true"></i> Current broadcast</div>
        ${active ? `<div class="alert-log">${App.esc(active.message)}</div>
          <div style="margin-top:12px"><button class="btn danger" id="clear-bc"><i class="ti ti-x" aria-hidden="true"></i> Clear broadcast</button></div>`
          : '<div class="empty">No active broadcast.</div>'}
      </div>
      <div class="card hud violet">
        <div class="card-title"><i class="ti ti-plus" aria-hidden="true"></i> Post broadcast</div>
        <form id="bc-form">
          <div class="field"><label for="bc-msg">Message</label><textarea id="bc-msg" placeholder="Primary WEB-03 link is down — use Backup 1."></textarea></div>
          <button class="btn primary" type="submit"><i class="ti ti-send" aria-hidden="true"></i> Broadcast</button>
        </form>
      </div>`;
    const clr = document.getElementById("clear-bc");
    if (clr) clr.addEventListener("click", async () => {
      try { await adminPost({ resource: "broadcasts", action: "clear" }); Sentinel.notify({ type: "ok", title: "CLEARED" }); renderBroadcasts(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });
    document.getElementById("bc-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("bc-msg").value.trim();
      if (!msg) return;
      try { await adminPost({ resource: "broadcasts", action: "post", message: msg }); Sentinel.notify({ type: "ok", title: "BROADCAST SENT" }); renderBroadcasts(); }
      catch (e) { Sentinel.notify({ type: "bad", title: "FAILED", message: e.message }); }
    });
  }

  renderTab();
})();
