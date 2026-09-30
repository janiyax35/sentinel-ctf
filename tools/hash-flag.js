#!/usr/bin/env node
/* Compute the HMAC-SHA256 of a flag using FLAG_PEPPER, exactly as the server does.
   Use it to set the optional STEG-01 decoy hash via SQL, or to verify a stored flag.

   Usage:
     FLAG_PEPPER=your-pepper node tools/hash-flag.js "Eclipse{example_flag}"
     FLAG_PEPPER=your-pepper node tools/hash-flag.js --ci "Eclipse{example_flag}"   (case-insensitive)

   Then, for a decoy:
     update public.challenge_flags set decoy_hmac = '<printed hash>'
     where challenge_id = (select id from public.challenges where slug = 'steg-01');
*/
const crypto = require("node:crypto");

const pepper = process.env.FLAG_PEPPER;
if (!pepper) { console.error("Set FLAG_PEPPER in the environment first."); process.exit(1); }

const args = process.argv.slice(2);
let ci = false;
const flags = [];
for (const a of args) { if (a === "--ci") ci = true; else flags.push(a); }
if (!flags.length) { console.error('Provide a flag, e.g. "Eclipse{...}"'); process.exit(1); }

for (const raw of flags) {
  let f = String(raw).trim();
  if (ci) f = f.toLowerCase();
  const hmac = crypto.createHmac("sha256", pepper).update(f, "utf8").digest("hex");
  console.log(hmac + "  (" + (ci ? "case-insensitive" : "case-sensitive") + ")  <- " + raw);
}
