/* Mission board */
(async function () {
  if (!(await App.guard())) return;
  await App.chrome("board");

  const DOMAIN_ICON = {
    "Steganography": "ti-wave-sine",
    "OSINT": "ti-map-pin-search",
    "Web": "ti-world-bolt",
    "Networking": "ti-network",
    "Cryptography": "ti-lock-code",
    "Reverse Engineering": "ti-binary"
  };
  const DIFF_CLASS = {
    "Easy": "diff-easy", "Easy-Moderate": "diff-moderate", "Moderate": "diff-moderate",
    "Moderate-Hard": "diff-hard-mod", "Hard": "diff-hard"
  };

  const trail = document.getElementById("trail");
  const hud = document.getElementById("hud");

  try {
    const data = await App.api("/api/challenges");
    const list = data.challenges || [];
    const solved = list.filter((c) => c.solved).length;
    const me = App.me || {};

    hud.innerHTML = `
      <div class="stat"><div class="k">Score</div><div class="v amber">${me.score == null ? 0 : me.score}</div></div>
      <div class="stat"><div class="k">Rank</div><div class="v cyan">${me.rank ? "#" + me.rank : "—"}</div></div>
      <div class="stat"><div class="k">Neutralised</div><div class="v">${solved}/${list.length}</div></div>
      <div class="stat"><div class="k">Intel spent</div><div class="v">${me.hint_spent == null ? 0 : me.hint_spent}</div></div>`;

    if (!list.length) { trail.innerHTML = '<div class="empty">No case files are active yet.</div>'; return; }

    trail.innerHTML = list.map((c, i) => {
      const icon = DOMAIN_ICON[c.category] || "ti-file-alert";
      const diff = DIFF_CLASS[c.difficulty] || "diff-moderate";
      const status = c.solved ? "Neutralised" : (c.intel_used ? "Intel used" : "Active threat");
      const last = i === list.length - 1;
      return `
      <a class="node ${c.solved ? "done" : ""}" href="/case?id=${encodeURIComponent(c.slug)}">
        <span class="ico"><i class="ti ${icon}" aria-hidden="true"></i></span>
        <span class="body">
          <span class="cid">${App.esc(c.slug.toUpperCase())}</span>
          <h3>${App.esc(c.title)}</h3>
          <span class="meta-row">
            <span class="badge ${diff}"><i class="ti ti-flame" aria-hidden="true"></i>${App.esc(c.difficulty)}</span>
            <span class="badge points"><i class="ti ti-diamond" aria-hidden="true"></i>${c.points} pts</span>
          </span>
        </span>
        <span class="st">${status}</span>
        ${last ? "" : '<span class="connector"></span>'}
      </a>`;
    }).join("");
  } catch (e) {
    trail.innerHTML = '<div class="empty">Could not load case files. ' + App.esc(e.message) + "</div>";
    Sentinel.notify({ type: "bad", title: "CONNECTION LOST", message: e.message });
  }
})();
