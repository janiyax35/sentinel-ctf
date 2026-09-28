/* Landing page: typewriter incident log + mini trail */
(function () {
  const lines = [
    { t: "[02:14:07] ", b: "SENTINEL", rest: ": unauthorised exfiltration detected on telemetry net" },
    { t: "[02:14:09] ", b: "SENTINEL", rest: ": actor fingerprint matched — “The Eclipse”", warn: true },
    { t: "[02:14:11] ", b: "SENTINEL", rest: ": primary audit trails wiped" },
    { t: "[02:14:12] ", b: "SENTINEL", rest: ": 6 residual artifacts quarantined" },
    { t: "[02:14:15] ", b: "SENTINEL", rest: ": incident responder requested → STANDBY" }
  ];
  const box = document.getElementById("termlog");
  let li = 0;
  function typeLine() {
    if (li >= lines.length) return;
    const L = lines[li];
    const div = document.createElement("div");
    div.className = "ln";
    box.appendChild(div);
    const full = L.rest;
    let ci = 0;
    div.innerHTML = L.t + "<b>" + L.b + "</b>";
    const restSpan = document.createElement("span");
    if (L.warn) restSpan.className = "warnc";
    div.appendChild(restSpan);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { restSpan.textContent = full; li++; typeLine(); return; }
    const timer = setInterval(() => {
      restSpan.textContent = full.slice(0, ++ci);
      if (ci >= full.length) { clearInterval(timer); li++; setTimeout(typeLine, 260); }
    }, 18);
  }
  typeLine();

  const stages = ["Signal", "Telemetry", "Web drop", "Packets", "Cipher", "Binary"];
  const trail = document.getElementById("mini-trail");
  trail.innerHTML = stages.map((s, i) =>
    `<span class="mini-node"><span class="d"></span>${s}</span>` +
    (i < stages.length - 1 ? '<span class="arrow">→</span>' : "")
  ).join("");

  // if already signed in, offer the board
  if (window.App && App.loadSession) {
    App.loadSession().then((s) => {
      if (s) {
        const btns = document.querySelectorAll('a.btn[href="/login"]');
        btns.forEach((b) => { b.setAttribute("href", "/board"); });
      }
    });
  }
})();
