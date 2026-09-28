const U = require("./_lib/util");

const RATE_MAX = 5;
const RATE_WINDOW_S = 60;

async function currentScore(uid) {
  const row = await U.sbSelect("scoreboard", "user_id=eq." + uid + "&select=score");
  return row && row[0] ? row[0].score : 0;
}

module.exports = async function (req, res) {
  if (req.method !== "POST") return U.json(res, 405, { error: "Method not allowed" });
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 401, { error: "Not authenticated" });
    const uid = id.profile.id;
    const body = await U.readJson(req);
    const slug = String(body.slug || "");
    const flagRaw = String(body.flag || "");
    if (!slug || !flagRaw || flagRaw.length > 200) return U.json(res, 400, { error: "Invalid submission" });

    // rate limit (per user)
    const since = new Date(Date.now() - RATE_WINDOW_S * 1000).toISOString();
    const window = await U.sbSelect("submissions",
      "user_id=eq." + uid + "&created_at=gte." + since + "&select=created_at&order=created_at.asc");
    if (window && window.length >= RATE_MAX) {
      const oldest = new Date(window[0].created_at).getTime();
      const retry = Math.max(1, Math.ceil((oldest + RATE_WINDOW_S * 1000 - Date.now()) / 1000));
      return U.json(res, 429, { rate_limited: true, retry_after: retry });
    }

    const rows = await U.sbSelect("challenges",
      "slug=eq." + encodeURIComponent(slug) + "&is_visible=eq.true&select=id,points,case_sensitive");
    const c = rows && rows[0];
    if (!c) return U.json(res, 404, { error: "Case not found" });

    // already solved?
    const solved = await U.sbSelect("solves", "user_id=eq." + uid + "&challenge_id=eq." + c.id + "&select=challenge_id");
    if (solved && solved.length) return U.json(res, 200, { already: true });

    const flagRows = await U.sbSelect("challenge_flags", "challenge_id=eq." + c.id + "&select=flag_hmac,decoy_hmac");
    const fr = flagRows && flagRows[0];
    const normalized = U.normalizeFlag(flagRaw, c.case_sensitive);
    const submittedHmac = U.hmacFlag(normalized);
    const correct = fr && fr.flag_hmac ? U.timingEqualHex(submittedHmac, fr.flag_hmac) : false;
    const isDecoy = !correct && fr && fr.decoy_hmac ? U.timingEqualHex(submittedHmac, fr.decoy_hmac) : false;

    // audit log (store raw text only when wrong)
    await U.sbInsert("submissions", {
      user_id: uid, challenge_id: c.id, is_correct: correct,
      submitted_text: correct ? null : flagRaw.slice(0, 200),
      ip: U.clientIp(req), user_agent: String(req.headers["user-agent"] || "").slice(0, 300)
    });

    const attemptsLeft = Math.max(0, RATE_MAX - ((window ? window.length : 0) + 1));

    if (correct) {
      try {
        await U.sb("solves", {
          method: "POST",
          headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" },
          body: [{ user_id: uid, challenge_id: c.id, points_awarded: c.points }]
        });
      } catch (e) { /* duplicate solve ignored */ }
      const score = await currentScore(uid);
      return U.json(res, 200, { correct: true, points_awarded: c.points, score: score, attempts_left: attemptsLeft });
    }
    return U.json(res, 200, { correct: false, decoy: isDecoy, attempts_left: attemptsLeft });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
