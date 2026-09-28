/* ==========================================================================
   Sentinel Alerts — custom toast + confirm modal system (no external library)
   Exposes:
     window.Sentinel.notify({ type, title, message, duration, icon }) -> { dismiss }
     window.Sentinel.confirm({ title, message, confirmText, cancelText, danger, icon }) -> Promise<bool>
   Toast types: ok | bad | warn | info | gold | muted
   ========================================================================== */
(function () {
  const ICONS = {
    ok: "ti-shield-check",
    bad: "ti-alert-triangle",
    warn: "ti-alert-hexagon",
    info: "ti-info-circle",
    gold: "ti-flame",
    muted: "ti-wifi-off"
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function host() {
    let h = document.getElementById("toasts");
    if (!h) {
      h = el("div");
      h.id = "toasts";
      h.setAttribute("aria-live", "polite");
      document.body.appendChild(h);
    }
    return h;
  }

  function notify(opts) {
    if (typeof opts === "string") opts = { title: opts };
    opts = opts || {};
    const type = opts.type || "info";
    const dur = opts.duration == null ? 5000 : opts.duration;
    const h = host();

    while (h.children.length >= 4) h.firstElementChild.remove();

    const toast = el("div", "toast " + type);
    toast.setAttribute("role", type === "bad" ? "alert" : "status");

    const icon = el("i", "ti " + (opts.icon || ICONS[type] || ICONS.info));
    icon.setAttribute("aria-hidden", "true");

    const content = el("div", "tc");
    content.appendChild(el("div", "tt", opts.title || ""));
    if (opts.message) content.appendChild(el("div", "tm", opts.message));

    const close = el("button", "tx", "×");
    close.setAttribute("aria-label", "Dismiss");

    const timer = el("div", "timer");

    toast.append(icon, content, close, timer);
    h.appendChild(toast);

    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 300);
    }
    close.addEventListener("click", dismiss);

    if (dur > 0) {
      timer.style.animation = "timer-run " + dur + "ms linear forwards";
      let remaining = dur;
      let start = Date.now();
      let tid = setTimeout(dismiss, dur);
      toast.addEventListener("mouseenter", () => {
        clearTimeout(tid);
        remaining -= Date.now() - start;
        timer.style.animationPlayState = "paused";
      });
      toast.addEventListener("mouseleave", () => {
        start = Date.now();
        tid = setTimeout(dismiss, remaining);
        timer.style.animationPlayState = "running";
      });
    } else {
      timer.remove();
    }
    return { dismiss };
  }

  function confirmModal(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const backdrop = el("div", "modal-backdrop");
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");

      const modal = el("div", "modal");

      const head = el("div", "mh");
      const hi = el("i", "ti " + (opts.icon || "ti-alert-hexagon"));
      hi.setAttribute("aria-hidden", "true");
      head.append(hi, el("h3", null, opts.title || "Are you sure?"));

      const p = el("p", null, opts.message || "");

      const act = el("div", "mact");
      const cancel = el("button", "btn ghost", opts.cancelText || "Cancel");
      const ok = el("button", "btn " + (opts.danger ? "danger" : "primary"), opts.confirmText || "Confirm");
      act.append(cancel, ok);

      modal.append(head, p, act);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      ok.focus();

      function done(v) {
        backdrop.remove();
        document.removeEventListener("keydown", onKey);
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") done(false);
        else if (e.key === "Enter") done(true);
        else if (e.key === "Tab") {
          const f = [cancel, ok];
          const i = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      }
      cancel.addEventListener("click", () => done(false));
      ok.addEventListener("click", () => done(true));
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) done(false); });
      document.addEventListener("keydown", onKey);
    });
  }

  window.Sentinel = window.Sentinel || {};
  window.Sentinel.notify = notify;
  window.Sentinel.confirm = confirmModal;
})();
