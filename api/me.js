const U = require("./_lib/util");

module.exports = async function (req, res) {
  try {
    const id = await U.getIdentity(req);
    if (!id) return U.json(res, 401, { error: "Not authenticated" });
    const p = id.profile;
    if (!p) return U.json(res, 403, { error: "No profile" });

    const board = await U.sbSelect("scoreboard", "select=user_id,score,solved_count,hint_spent,last_score_at&order=score.desc,last_score_at.asc");
    let rank = null, mine = null;
    for (let i = 0; i < board.length; i++) {
      if (board[i].user_id === p.id) { rank = i + 1; mine = board[i]; break; }
    }
    const out = {
      id: p.id,
      display_name: p.display_name,
      role: p.role,
      score: mine ? mine.score : 0,
      rank: rank,
      hint_spent: mine ? mine.hint_spent : 0
    };

    if (new URL(req.url, "http://x").searchParams.get("full")) {
      const solves = await U.sbSelect("solves",
        "user_id=eq." + p.id + "&select=points_awarded,solved_at,challenges(slug,title)&order=solved_at.desc");
      out.solves = (solves || []).map((s) => ({
        slug: s.challenges ? s.challenges.slug : "",
        title: s.challenges ? s.challenges.title : "",
        points_awarded: s.points_awarded,
        solved_at: s.solved_at
      }));
      const subs = await U.sbSelect("submissions",
        "user_id=eq." + p.id + "&select=is_correct,created_at,challenges(slug)&order=created_at.desc&limit=25");
      out.submissions = (subs || []).map((s) => ({
        slug: s.challenges ? s.challenges.slug : "",
        is_correct: s.is_correct,
        created_at: s.created_at
      }));
    }
    return U.json(res, 200, out);
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
