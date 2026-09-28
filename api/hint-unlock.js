const U = require("./_lib/util");

module.exports = async function (req, res) {
  if (req.method !== "POST") return U.json(res, 405, { error: "Method not allowed" });
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 401, { error: "Not authenticated" });
    const uid = id.profile.id;
    const body = await U.readJson(req);
    const hintId = body.hint_id;
    if (!hintId) return U.json(res, 400, { error: "Missing hint_id" });

    const hintRows = await U.sbSelect("hints",
      "id=eq." + encodeURIComponent(hintId) + "&select=id,challenge_id,position,cost,content_md,challenges(is_visible)");
    const h = hintRows && hintRows[0];
    if (!h) return U.json(res, 404, { error: "Intel not found" });
    if (h.challenges && h.challenges.is_visible === false) return U.json(res, 403, { error: "Case not available" });

    // progressive gate: previous position must be unlocked
    if (h.position > 1) {
      const prev = await U.sbSelect("hints",
        "challenge_id=eq." + h.challenge_id + "&position=eq." + (h.position - 1) + "&select=id");
      if (prev && prev[0]) {
        const pu = await U.sbSelect("hint_unlocks",
          "user_id=eq." + uid + "&hint_id=eq." + prev[0].id + "&select=hint_id");
        if (!pu || !pu.length) return U.json(res, 403, { error: "Decrypt the previous intel first" });
      }
    }

    // charge once (ignore duplicates); snapshot the cost paid
    try {
      await U.sb("hint_unlocks", {
        method: "POST",
        headers: { "Prefer": "resolution=ignore-duplicates,return=minimal" },
        body: [{ user_id: uid, hint_id: h.id, cost_paid: h.cost }]
      });
    } catch (e) { /* already unlocked */ }

    const scoreRow = await U.sbSelect("scoreboard", "user_id=eq." + uid + "&select=score");
    const score = scoreRow && scoreRow[0] ? scoreRow[0].score : null;
    return U.json(res, 200, { content_md: h.content_md, cost: h.cost, score: score });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
