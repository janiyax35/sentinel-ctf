/* Shared server helpers for the Sentinel API (Vercel serverless, Node runtime).
   No npm packages — uses global fetch and node:crypto only. */
const crypto = require("node:crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FLAG_PEPPER = process.env.FLAG_PEPPER || "";
const BUCKET = process.env.CHALLENGE_BUCKET || "challenge-files";

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

/* ---- Supabase PostgREST ---- */
async function sb(path, opts) {
  opts = opts || {};
  const headers = Object.assign({
    "apikey": SERVICE_KEY,
    "Authorization": "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json"
  }, opts.headers || {});
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error((data && data.message) || ("Supabase error " + res.status));
    err.status = res.status; err.detail = data;
    throw err;
  }
  return data;
}
const sbSelect = (table, query) => sb(table + (query ? "?" + query : ""));
const sbInsert = (table, row) => sb(table, { method: "POST", headers: { "Prefer": "return=representation" }, body: Array.isArray(row) ? row : [row] });
const sbUpdate = (table, filter, patch) => sb(table + "?" + filter, { method: "PATCH", headers: { "Prefer": "return=representation" }, body: patch });
const sbDelete = (table, filter) => sb(table + "?" + filter, { method: "DELETE" });

/* ---- Supabase Auth admin ---- */
async function authAdmin(path, opts) {
  opts = opts || {};
  const res = await fetch(SUPABASE_URL + "/auth/v1/" + path, {
    method: opts.method || "GET",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json"
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error((data && (data.msg || data.message || data.error_description)) || ("Auth error " + res.status));
    err.status = res.status; err.detail = data;
    throw err;
  }
  return data;
}

/* verify the caller's access token → returns the auth user or null */
async function verifyToken(token) {
  if (!token) return null;
  try {
    const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { "apikey": SERVICE_KEY, "Authorization": "Bearer " + token }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function bearer(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"] || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

/* returns { user, profile } or null */
async function getIdentity(req) {
  const user = await verifyToken(bearer(req));
  if (!user || !user.id) return null;
  const rows = await sbSelect("profiles", "id=eq." + user.id + "&select=*");
  const profile = rows && rows[0] ? rows[0] : null;
  if (profile && profile.is_disabled) return null;
  return { user, profile };
}

/* ---- flag crypto ---- */
function normalizeFlag(flag, caseSensitive) {
  let f = String(flag == null ? "" : flag).trim();
  if (!caseSensitive) f = f.toLowerCase();
  return f;
}
function hmacFlag(normalized) {
  return crypto.createHmac("sha256", FLAG_PEPPER).update(normalized, "utf8").digest("hex");
}
function timingEqualHex(a, b) {
  const ba = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/* ---- storage signed URL ---- */
async function signedUrl(storagePath, expiresIn) {
  const res = await fetch(SUPABASE_URL + "/storage/v1/object/sign/" + BUCKET + "/" + storagePath, {
    method: "POST",
    headers: { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresIn || 60 })
  });
  if (!res.ok) { const t = await res.text(); throw new Error("Sign failed: " + t); }
  const data = await res.json();
  return SUPABASE_URL + "/storage/v1" + data.signedURL;
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket ? req.socket.remoteAddress : "";
}

module.exports = {
  SUPABASE_URL, BUCKET, json, readJson, sb, sbSelect, sbInsert, sbUpdate, sbDelete,
  authAdmin, verifyToken, bearer, getIdentity, normalizeFlag, hmacFlag, timingEqualHex,
  signedUrl, clientIp
};
