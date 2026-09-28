/* Responder dossier */
(async function () {
  if (!(await App.guard())) return;
  await App.chrome(null);
  const root = document.getElementById("dossier");

  try {
    const d = await App.api("/api/me?full=1");
    const initials = (d.display_name || "R").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    root.innerHTML = `
      <div class="card hud" style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:16px">
          <span class="avatar" style="width:56px;height:56px;font-size:18px">${App.esc(initials)}</span>
          <div>
            <h1 style="font-size:24px">${App.esc(d.display_name || "Responder")}</h1>
            <div class="access-note" style="margin-top:2px">${d.role === "admin" ? "Sentinel administrator" : "Field responder"}</div>
          </div>
        </div>
        <div class="hud-bar" style="margin-top:20px;margin-bottom:0">
          <div class="stat"><div class="k">Score</div><div class="v amber">${d.score == null ? 0 : d.score}</div></div>
          <div class="stat"><div class="k">Rank</div><div class="v cyan">${d.rank ? "#" + d.rank : "—"}</div></div>
          <div class="stat"><div class="k">Solves</div><div class="v">${(d.solves || []).length}</div></div>
          <div class="stat"><div class="k">Intel spent</div><div class="v">${d.hint_spent == null ? 0 : d.hint_spent}</div></div>
        </div>
      </div>

      <div class="card hud cyan" style="margin-bottom:24px">
        <div class="card-title"><i class="ti ti-shield-check" aria-hidden="true"></i> Cases neutralised</div>
        ${(d.solves && d.solves.length) ? `<div class="evidence">${d.solves.map((s) => `
          <div class="file-row">
            <i class="ti ti-flag-check fi" aria-hidden="true"></i>
            <div class="fmeta"><div class="fname">${App.esc(s.title)}</div>
              <div class="fsub">${App.esc(s.slug.toUpperCase())} · ${new Date(s.solved_at).toLocaleString()}</div></div>
            <div class="fact"><span class="badge points">+${s.points_awarded} pts</span></div>
          </div>`).join("")}</div>` : '<div class="empty">No cases closed yet.</div>'}
      </div>

      <div class="card hud">
        <div class="card-title"><i class="ti ti-history" aria-hidden="true"></i> Recent submissions</div>
        ${(d.submissions && d.submissions.length) ? `<div class="recent">${d.submissions.map((a) => `
          <div class="r ${a.is_correct ? "ok" : "no"}"><i class="ti ${a.is_correct ? "ti-check" : "ti-x"}" aria-hidden="true"></i>
          ${App.esc(a.slug ? a.slug.toUpperCase() : "")} · ${a.is_correct ? "accepted" : "rejected"} · ${new Date(a.created_at).toLocaleString()}</div>`).join("")}</div>`
          : '<div class="empty">No submissions logged.</div>'}
      </div>`;
  } catch (e) {
    root.innerHTML = '<div class="empty">Could not load your dossier. ' + App.esc(e.message) + "</div>";
  }
})();
