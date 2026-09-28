const U = require("./_lib/util");

async function requireAdmin(req) {
  const id = await U.getIdentity(req);
  if (!id || !id.profile) return { err: [401, "Not authenticated"] };
  if (id.profile.role !== "admin") return { err: [403, "Admin only"] };
  return { profile: id.profile };
}

/* ---------------- reads ---------------- */
async function handleGet(req, res, resource, params) {
  if (resource === "stats") {
    const [users, solves, subs, wrong, perCh] = await Promise.all([
      U.sbSelect("profiles", "select=id"),
      U.sbSelect("solves", "select=user_id"),
      U.sbSelect("submissions", "select=id"),
      U.sbSelect("submissions", "is_correct=eq.false&created_at=gte." + new Date(Date.now() - 3600e3).toISOString() + "&select=id"),
      U.sbSelect("challenges", "select=slug,title,solves(count)&order=sort_order.asc")
    ]);
    const per_challenge = (perCh || []).map((c) => ({
      slug: c.slug, title: c.title, solves: (c.solves && c.solves[0]) ? c.solves[0].count : 0
    }));
    return U.json(res, 200, { stats: {
      users: users ? users.length : 0,
      solves: solves ? solves.length : 0,
      submissions: subs ? subs.length : 0,
      wrong_last_hour: wrong ? wrong.length : 0,
      per_challenge
    } });
  }
  if (resource === "challenges") {
    const chs = await U.sbSelect("challenges",
      "select=*,challenge_flags(challenge_id)&order=sort_order.asc,stage_no.asc");
    return U.json(res, 200, {
      challenges: (chs || []).map((c) => ({
        id: c.id, slug: c.slug, stage_no: c.stage_no, title: c.title, category: c.category,
        difficulty: c.difficulty, points: c.points, description_md: c.description_md,
        case_sensitive: c.case_sensitive, is_visible: c.is_visible, sort_order: c.sort_order,
        has_flag: !!(c.challenge_flags && c.challenge_flags.length)
      }))
    });
  }
  if (resource === "hints")
    return U.json(res, 200, { hints: await U.sbSelect("hints", "select=*&order=challenge_id.asc,position.asc") });
  if (resource === "files")
    return U.json(res, 200, { files: await U.sbSelect("challenge_files", "select=*&order=challenge_id.asc,display_name.asc") });
  if (resource === "endpoints")
    return U.json(res, 200, { endpoints: await U.sbSelect("challenge_endpoints", "select=*&order=challenge_id.asc,sort_order.asc") });
  if (resource === "users") {
    const profiles = await U.sbSelect("profiles", "select=id,display_name,role,is_disabled&order=display_name.asc");
    let emails = {};
    try {
      const au = await U.authAdmin("admin/users?per_page=200");
      (au.users || au || []).forEach((u) => { emails[u.id] = u.email; });
    } catch (e) { /* email merge optional */ }
    return U.json(res, 200, { users: (profiles || []).map((p) => Object.assign({ email: emails[p.id] || "" }, p)) });
  }
  if (resource === "submissions") {
    const limit = Math.min(parseInt(params.get("limit") || "100", 10) || 100, 300);
    const subs = await U.sbSelect("submissions",
      "select=created_at,is_correct,submitted_text,ip,profiles(display_name),challenges(slug)&order=created_at.desc&limit=" + limit);
    return U.json(res, 200, {
      submissions: (subs || []).map((s) => ({
        created_at: s.created_at, is_correct: s.is_correct, submitted_text: s.submitted_text, ip: s.ip,
        display_name: s.profiles ? s.profiles.display_name : "",
        slug: s.challenges ? s.challenges.slug : ""
      }))
    });
  }
  if (resource === "broadcasts") {
    const rows = await U.sbSelect("announcements", "is_active=eq.true&select=*&order=created_at.desc&limit=1");
    return U.json(res, 200, { active: rows && rows[0] ? rows[0] : null });
  }
  return U.json(res, 400, { error: "Unknown resource" });
}

/* ---------------- writes ---------------- */
async function handlePost(req, res, body) {
  const resource = body.resource;
  const action = body.action;

  if (resource === "challenges") {
    if (action === "create" || action === "update") {
      const row = {};
      ["slug", "title", "category", "difficulty", "description_md"].forEach((k) => { if (body[k] !== undefined) row[k] = body[k]; });
      if (body.points !== undefined) row.points = parseInt(body.points, 10);
      if (body.stage_no !== undefined) row.stage_no = body.stage_no === null ? null : parseInt(body.stage_no, 10);
      if (body.case_sensitive !== undefined) row.case_sensitive = !!body.case_sensitive;
      if (body.is_visible !== undefined) row.is_visible = !!body.is_visible;
      if (body.sort_order !== undefined) row.sort_order = parseInt(body.sort_order, 10);
      if (action === "create") {
        if (row.sort_order === undefined && row.stage_no != null) row.sort_order = row.stage_no;
        const r = await U.sbInsert("challenges", row);
        return U.json(res, 200, { ok: true, challenge: r[0] });
      }
      await U.sbUpdate("challenges", "id=eq." + encodeURIComponent(body.id), row);
      return U.json(res, 200, { ok: true });
    }
    if (action === "set_flag") {
      const chs = await U.sbSelect("challenges", "id=eq." + encodeURIComponent(body.id) + "&select=case_sensitive");
      const c = chs && chs[0];
      if (!c) return U.json(res, 404, { error: "Case not found" });
      const norm = U.normalizeFlag(body.flag, c.case_sensitive);
      const hmac = U.hmacFlag(norm);
      await U.sb("challenge_flags", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: [{ challenge_id: body.id, flag_hmac: hmac }]
      });
      return U.json(res, 200, { ok: true });
    }
    if (action === "delete") { await U.sbDelete("challenges", "id=eq." + encodeURIComponent(body.id)); return U.json(res, 200, { ok: true }); }
  }

  if (resource === "hints") {
    if (action === "create") {
      const r = await U.sbInsert("hints", {
        challenge_id: body.challenge_id, position: parseInt(body.position, 10),
        cost: parseInt(body.cost, 10), content_md: body.content_md || ""
      });
      return U.json(res, 200, { ok: true, hint: r[0] });
    }
    if (action === "update") {
      const patch = {};
      if (body.position !== undefined) patch.position = parseInt(body.position, 10);
      if (body.cost !== undefined) patch.cost = parseInt(body.cost, 10);
      if (body.content_md !== undefined) patch.content_md = body.content_md;
      await U.sbUpdate("hints", "id=eq." + encodeURIComponent(body.id), patch);
      return U.json(res, 200, { ok: true });
    }
    if (action === "delete") { await U.sbDelete("hints", "id=eq." + encodeURIComponent(body.id)); return U.json(res, 200, { ok: true }); }
  }

  if (resource === "files") {
    if (action === "create") {
      const r = await U.sbInsert("challenge_files", {
        challenge_id: body.challenge_id, display_name: body.display_name,
        storage_path: body.storage_path, size_bytes: body.size_bytes || null, sha256: body.sha256 || null
      });
      return U.json(res, 200, { ok: true, file: r[0] });
    }
    if (action === "delete") { await U.sbDelete("challenge_files", "id=eq." + encodeURIComponent(body.id)); return U.json(res, 200, { ok: true }); }
  }

  if (resource === "endpoints") {
    if (action === "create") {
      if (!/^https?:\/\//i.test(String(body.url || ""))) return U.json(res, 400, { error: "URL must be http(s)" });
      const r = await U.sbInsert("challenge_endpoints", {
        challenge_id: body.challenge_id, label: body.label || "Primary", url: body.url,
        kind: body.kind === "backup" ? "backup" : "primary", note: body.note || null,
        is_active: body.is_active !== false, sort_order: body.kind === "backup" ? 10 : 0
      });
      return U.json(res, 200, { ok: true, endpoint: r[0] });
    }
    if (action === "update") {
      const patch = {};
      ["label", "url", "kind", "note"].forEach((k) => { if (body[k] !== undefined) patch[k] = body[k]; });
      if (patch.url && !/^https?:\/\//i.test(patch.url)) return U.json(res, 400, { error: "URL must be http(s)" });
      if (body.is_active !== undefined) patch.is_active = !!body.is_active;
      await U.sbUpdate("challenge_endpoints", "id=eq." + encodeURIComponent(body.id), patch);
      return U.json(res, 200, { ok: true });
    }
    if (action === "delete") { await U.sbDelete("challenge_endpoints", "id=eq." + encodeURIComponent(body.id)); return U.json(res, 200, { ok: true }); }
  }

  if (resource === "users") {
    if (action === "create") {
      const created = await U.authAdmin("admin/users", {
        method: "POST",
        body: { email: body.email, password: body.password, email_confirm: true, user_metadata: { display_name: body.display_name } }
      });
      const newId = created && created.id;
      // ensure a profile row with the requested name + role (idempotent)
      await U.sb("profiles", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: [{ id: newId, display_name: body.display_name, role: body.role === "admin" ? "admin" : "player" }]
      });
      return U.json(res, 200, { ok: true, id: newId });
    }
    if (action === "update") {
      const patch = {};
      if (body.display_name !== undefined) patch.display_name = body.display_name;
      if (body.role !== undefined) patch.role = body.role === "admin" ? "admin" : "player";
      if (body.is_disabled !== undefined) patch.is_disabled = !!body.is_disabled;
      await U.sbUpdate("profiles", "id=eq." + encodeURIComponent(body.id), patch);
      return U.json(res, 200, { ok: true });
    }
  }

  if (resource === "broadcasts") {
    if (action === "post") {
      await U.sbUpdate("announcements", "is_active=eq.true", { is_active: false });
      await U.sbInsert("announcements", { message: String(body.message || "").slice(0, 500), level: "warning", is_active: true });
      return U.json(res, 200, { ok: true });
    }
    if (action === "clear") {
      await U.sbUpdate("announcements", "is_active=eq.true", { is_active: false });
      return U.json(res, 200, { ok: true });
    }
  }

  return U.json(res, 400, { error: "Unknown action" });
}

module.exports = async function (req, res) {
  try {
    const gate = await requireAdmin(req);
    if (gate.err) return U.json(res, gate.err[0], { error: gate.err[1] });

    if (req.method === "GET") {
      const url = new URL(req.url, "http://x");
      const resource = url.searchParams.get("resource");
      return await handleGet(req, res, resource, url.searchParams);
    }
    if (req.method === "POST") {
      const body = await U.readJson(req);
      return await handlePost(req, res, body);
    }
    return U.json(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return U.json(res, 500, { error: e.message });
  }
};
