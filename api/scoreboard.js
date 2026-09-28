const U = require("./_lib/util");

module.exports = async function (req, res) {
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 401, { error: "Not authenticated" });

    const ranking = await U.sbSelect("scoreboard",
      "select=user_id,display_name,score,solved_count&order=score.desc,last_score_at.asc");

    // score progression for the top 5, built from solves (cumulative points)
    const top = (ranking || []).slice(0, 5);
    let series = [];
    if (top.length) {
      const ids = top.map((r) => r.user_id).join(",");
      const solves = await U.sbSelect("solves",
        "user_id=in.(" + ids + ")&select=user_id,points_awarded,solved_at&order=solved_at.asc");
      const byUser = {};
      (solves || []).forEach((s) => {
        (byUser[s.user_id] = byUser[s.user_id] || []).push(s);
      });
      series = top.map((r) => {
        let cum = 0;
        const pts = (byUser[r.user_id] || []).map((s) => {
          cum += s.points_awarded;
          return { t: new Date(s.solved_at).getTime(), y: cum };
        });
        return { display_name: r.display_name, points: pts };
      });
    }

    return U.json(res, 200, { ranking: ranking || [], series: series });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
