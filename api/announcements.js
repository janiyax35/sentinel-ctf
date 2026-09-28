const U = require("./_lib/util");

/* Returns the active broadcast (if any) for the signed-in responder. */
module.exports = async function (req, res) {
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 200, {});
    const rows = await U.sbSelect("announcements",
      "is_active=eq.true&select=id,message,level&order=created_at.desc&limit=1");
    const a = rows && rows[0];
    if (!a) return U.json(res, 200, {});
    return U.json(res, 200, { id: a.id, message: a.message, level: a.level });
  } catch (e) {
    return U.json(res, 200, {});
  }
};
