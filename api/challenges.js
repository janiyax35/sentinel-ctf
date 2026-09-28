const U = require("./_lib/util");

const RATE_MAX = 5;
const RATE_WINDOW_S = 60;

module.exports = async function (req, res) {
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 401, { error: "Not authenticated" });
    const uid = id.profile.id;
    const slug = new URL(req.url, "http://x").searchParams.get("slug");

    if (!slug) {
      const list = await U.sbSelect("challenges",
        "is_visible=eq.true&select=id,slug,stage_no,title,category,difficulty,points&order=sort_order.asc,stage_no.asc");
      const solves = await U.sbSelect("solves", "user_id=eq." + uid + "&select=challenge_id");
      const solvedSet = new Set((solves || []).map((s) => s.challenge_id));
      const unlocks = await U.sbSelect("hint_unlocks", "user_id=eq." + uid + "&select=hints(challenge_id)");
      const intelSet = new Set((unlocks || []).map((u) => u.hints && u.hints.challenge_id).filter(Boolean));
      return U.json(res, 200, {
        challenges: (list || []).map((c) => ({
          slug: c.slug, stage_no: c.stage_no, title: c.title, category: c.category,
          difficulty: c.difficulty, points: c.points,
          solved: solvedSet.has(c.id), intel_used: intelSet.has(c.id)
        }))
      });
    }

    // detail
    const rows = await U.sbSelect("challenges",
      "slug=eq." + encodeURIComponent(slug) + "&is_visible=eq.true&select=*");
    const c = rows && rows[0];
    if (!c) return U.json(res, 404, { error: "Case not found" });

    const [files, endpoints, hints, unlocks, solved] = await Promise.all([
      U.sbSelect("challenge_files", "challenge_id=eq." + c.id + "&select=id,display_name,size_bytes,sha256&order=display_name.asc"),
      U.sbSelect("challenge_endpoints", "challenge_id=eq." + c.id + "&is_active=eq.true&select=label,url,kind,note&order=sort_order.asc,label.asc"),
      U.sbSelect("hints", "challenge_id=eq." + c.id + "&select=id,position,cost,content_md&order=position.asc"),
      U.sbSelect("hint_unlocks", "user_id=eq." + uid + "&select=hint_id"),
      U.sbSelect("solves", "user_id=eq." + uid + "&challenge_id=eq." + c.id + "&select=challenge_id")
    ]);
    const unlockedSet = new Set((unlocks || []).map((u) => u.hint_id));

    const since = new Date(Date.now() - RATE_WINDOW_S * 1000).toISOString();
    const recentWindow = await U.sbSelect("submissions",
      "user_id=eq." + uid + "&created_at=gte." + since + "&select=id");
    const attemptsLeft = Math.max(0, RATE_MAX - (recentWindow ? recentWindow.length : 0));

    const recent = await U.sbSelect("submissions",
      "user_id=eq." + uid + "&challenge_id=eq." + c.id + "&select=is_correct,created_at&order=created_at.desc&limit=5");

    return U.json(res, 200, {
      challenge: {
        slug: c.slug, title: c.title, category: c.category, difficulty: c.difficulty,
        points: c.points, description_md: c.description_md,
        case_sensitive: c.case_sensitive, solved: (solved || []).length > 0
      },
      files: files || [],
      endpoints: endpoints || [],
      hints: (hints || []).map((h) => ({
        id: h.id, position: h.position, cost: h.cost,
        unlocked: unlockedSet.has(h.id),
        content_md: unlockedSet.has(h.id) ? h.content_md : null
      })),
      attempts_left: attemptsLeft,
      attempts_recent: recent || []
    });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
