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

      <div class="card hud" style="margin-bottom:24px">
        <div class="card-title"><i class="ti ti-history" aria-hidden="true"></i> Recent submissions</div>
        ${(d.submissions && d.submissions.length) ? `<div class="recent">${d.submissions.map((a) => `
          <div class="r ${a.is_correct ? "ok" : "no"}"><i class="ti ${a.is_correct ? "ti-check" : "ti-x"}" aria-hidden="true"></i>
          ${App.esc(a.slug ? a.slug.toUpperCase() : "")} · ${a.is_correct ? "accepted" : "rejected"} · ${new Date(a.created_at).toLocaleString()}</div>`).join("")}</div>`
          : '<div class="empty">No submissions logged.</div>'}
      </div>

      <div class="card hud violet">
        <div class="card-title"><i class="ti ti-lock" aria-hidden="true"></i> Change password</div>
        <div class="access-note" style="margin-bottom:12px">Set a new password for your account. If you ever forget it, contact an administrator for a manual reset.</div>
        <form id="pw-form" autocomplete="off">
          <div class="field"><label for="pw-cur">Current password</label>
            <input id="pw-cur" type="password" autocomplete="current-password" required /></div>
          <div class="field"><label for="pw-new">New password</label>
            <input id="pw-new" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters" /></div>
          <div class="field"><label for="pw-new2">Confirm new password</label>
            <input id="pw-new2" type="password" autocomplete="new-password" minlength="8" required /></div>
          <button class="btn primary" type="submit" id="pw-btn"><i class="ti ti-device-floppy" aria-hidden="true"></i> Update password</button>
        </form>
      </div>`;

    wirePasswordForm();
  } catch (e) {
    root.innerHTML = '<div class="empty">Could not load your dossier. ' + App.esc(e.message) + "</div>";
  }

  function wirePasswordForm() {
    const form = document.getElementById("pw-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cur = document.getElementById("pw-cur").value;
      const nw = document.getElementById("pw-new").value;
      const nw2 = document.getElementById("pw-new2").value;
      const email = (App.session && App.session.user) ? App.session.user.email : "";

      if (nw.length < 8) { Sentinel.notify({ type: "bad", title: "TOO SHORT", message: "New password must be at least 8 characters." }); return; }
      if (nw !== nw2) { Sentinel.notify({ type: "bad", title: "MISMATCH", message: "The new passwords do not match." }); return; }
      if (!email) { Sentinel.notify({ type: "bad", title: "SESSION ERROR", message: "Please sign in again." }); return; }

      const btn = document.getElementById("pw-btn");
      btn.disabled = true;
      try {
        // verify the current password by re-authenticating before allowing a change
        const check = await App.supa.auth.signInWithPassword({ email: email, password: cur });
        if (check.error) { throw new Error("Current password is incorrect."); }
        const upd = await App.supa.auth.updateUser({ password: nw });
        if (upd.error) { throw new Error(upd.error.message); }
        form.reset();
        Sentinel.notify({ type: "ok", title: "PASSWORD UPDATED", message: "Your new password is active." });
      } catch (err) {
        Sentinel.notify({ type: "bad", title: "FAILED", message: err.message });
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
