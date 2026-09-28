const U = require("./_lib/util");

/* Returns a short-lived signed download URL for an evidence file.
   Only authenticated responders may request it. */
module.exports = async function (req, res) {
  try {
    const id = await U.getIdentity(req);
    if (!id || !id.profile) return U.json(res, 401, { error: "Not authenticated" });
    const fileId = new URL(req.url, "http://x").searchParams.get("id");
    if (!fileId) return U.json(res, 400, { error: "Missing id" });

    const rows = await U.sbSelect("challenge_files",
      "id=eq." + encodeURIComponent(fileId) + "&select=storage_path,display_name,challenges(is_visible)");
    const f = rows && rows[0];
    if (!f) return U.json(res, 404, { error: "File not found" });
    if (f.challenges && f.challenges.is_visible === false) return U.json(res, 403, { error: "Not available" });

    const url = await U.signedUrl(f.storage_path, 60);
    return U.json(res, 200, { url: url, name: f.display_name });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
