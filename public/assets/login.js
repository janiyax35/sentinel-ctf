/* Login page logic */
(async function () {
  // already logged in? go to board
  await App.loadSession();
  if (App.session) { location.replace("/board"); return; }

  const form = document.getElementById("login-form");
  const errEl = document.getElementById("form-err");
  const btn = document.getElementById("submit-btn");

  function nextTarget() {
    const p = new URLSearchParams(location.search).get("next");
    if (p && p.startsWith("/") && !p.startsWith("//")) return p;
    return "/board";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) { errEl.textContent = "Enter your email and passphrase."; return; }

    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="ring" style="--p:70"></span> Authenticating…';
    try {
      const { error } = await App.supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
      Sentinel.notify({ type: "ok", title: "ACCESS GRANTED", message: "Welcome back, responder.", duration: 1500 });
      setTimeout(() => location.replace(nextTarget()), 600);
    } catch (err) {
      errEl.textContent = "Authentication failed. Check your credentials.";
      Sentinel.notify({ type: "bad", title: "ACCESS DENIED", message: "Invalid email or passphrase." });
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
})();
