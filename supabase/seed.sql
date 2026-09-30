-- ============================================================================
-- SENTINEL CTF — seed content (6 stages, intel slots, files, access links).
-- Run AFTER schema.sql, on a FRESH database only.
--
-- WARNING: do not re-run this on a live event database. It deletes and
-- re-inserts the intel rows, which also deletes every responder's unlocked
-- intel (hint_unlocks cascades), and resets the evidence file records.
--
-- No answer material lives in this repository:
--   * Flags are not seeded. Flag HMACs need the secret FLAG_PEPPER, which only
--     lives in the server environment. Set each flag from the admin console
--     (Sentinel Control -> Challenges -> key icon).
--   * Intel rows are created with their positions and point costs but
--     placeholder text. Fill in the real text from Sentinel Control -> Intel,
--     or run your private supabase/seed.local.sql (gitignored) after this file.
-- ============================================================================

-- ---------- challenges ----------
insert into public.challenges (slug, stage_no, title, category, difficulty, points, case_sensitive, is_visible, sort_order, description_md) values
('steg-01', 1, 'The Intercepted Frequency', 'Steganography', 'Easy', 100, true, true, 1,
$md$**Sentinel alert.** A rogue radio-frequency burst was detected on the observatory's primary deep-space audio receiver. Incident response isolated the transmission `signal_alpha.wav`, but it sounds like white noise and radio interference.

**Objective — recover the true flag hidden in the signal.**

1. Inspect the frequency spectrum of `signal_alpha.wav` with a visual audio tool.
2. Not everything you see is real. Extract the file metadata to locate the missing carrier file `signal_beta.wav`.
3. Combine the two tracks and cancel the masking carrier wave (phase inversion) to isolate the hidden message.

*Tools: Audacity, exiftool, a Morse decoder.*$md$),

('osint-02', 2, 'Ground Telemetry', 'OSINT', 'Easy-Moderate', 150, false, true, 2,
$md$**Sentinel alert.** Following the Stage 1 clue, Sentinel recovered a GPS telemetry log (`telemetry_route.log`) transmitted from an unauthorised vehicle parked near the observatory perimeter on the night of the breach.

**Objective — identify the destination facility where the mobile uplink antenna was hidden.**

- Parse the coordinate lines and plot the route on a mapping tool.
- Follow the stops to the final waypoint and read off the facility's name.
- The flag is the facility name in lowercase with underscores, e.g. `Eclipse{some_place_name}`.

*Tools: Google Maps / Google Earth, GPS Visualizer, a text editor.*$md$),

('web-03', 3, 'The Staging Drop', 'Web', 'Moderate', 200, true, true, 3,
$md$**Sentinel alert.** An unauthorised web application is running on an exposed observatory test server. Syndicate operatives use this portal to stage exfiltrated telemetry before offsite routing.

**Objective — bypass authentication and read the exfiltration config from the admin dashboard.**

- Audit the login portal and find the authentication vulnerability.
- Bypass access control and reach the administrator dashboard.
- The flag is shown in an internal server alert on that dashboard.

Use the access link on this page. The target is behind Cloudflare Access — see **Rules** for how to authenticate with a browser, Burp, or `cloudflared access curl`.

*Tools: a browser, Burp Suite, curl.*$md$),

('net-04', 4, 'Operation Silent Frequency', 'Networking', 'Moderate', 250, true, true, 4,
$md$**Sentinel alert.** An SDR tap on the satellite dish intercepted an active exfiltration burst. Sentinel dumped the raw bytes into `raw_telemetry_dump.txt` before the connection dropped.

**Objective — reconstruct the captured transfer and read the hidden flag.**

1. Sanitise the log: strip the logging prefixes to recover the raw hex.
2. Convert the clean hex dump into a `.pcap` capture.
3. Analyse the capture, follow the covert TCP stream, and read the transferred memo.

*Tools: sed/awk, xxd or text2pcap, Wireshark, tshark.*$md$),

('crypto-05', 5, 'The Weak Cipher', 'Cryptography', 'Moderate-Hard', 300, true, true, 5,
$md$**Sentinel alert.** Sentinel recovered an encrypted archive (`schematics_key.enc`) and the syndicate's own helper script (`encryptor.py`) used to encrypt their access tokens.

**Objective — analyse the flawed cipher and recover the plaintext key.**

- Read `encryptor.py` and find the weakness in how the key is generated.
- The keyspace is much smaller than it looks, and you already know the plaintext starts with `Eclipse{`.
- Write a solver to recover the flag.

*Tools: Python 3, a text editor.*$md$),

('rev-06', 6, 'The Kill-Switch Binary', 'Reverse Engineering', 'Hard', 400, true, true, 6,
$md$**Sentinel alert (capstone).** Operatives scheduled an automatic telemetry-wipe payload on the primary satellite comms server. Sentinel halted it and dumped the compiled Linux executable `eclipse_daemon`. Find the internal kill-switch parameter to deactivate the payload for good.

**Objective — recover the hardcoded termination flag.**

- `strings` will fail: the strings are obfuscated in `.rodata`.
- Decompile `main()` and the validation routine, reconstruct the comparison, or break on the compare in a debugger.
- Recover the deactivation code / termination flag.

*Tools: Ghidra, GDB, objdump, ltrace.*$md$)
on conflict (slug) do update set
  stage_no = excluded.stage_no, title = excluded.title, category = excluded.category,
  difficulty = excluded.difficulty, points = excluded.points, case_sensitive = excluded.case_sensitive,
  is_visible = excluded.is_visible, sort_order = excluded.sort_order, description_md = excluded.description_md,
  updated_at = now();

-- ---------- hints (delete + re-insert so re-running stays clean) ----------
delete from public.hints where challenge_id in (select id from public.challenges where slug in
  ('steg-01','osint-02','web-03','net-04','crypto-05','rev-06'));

insert into public.hints (challenge_id, position, cost, content_md)
select id, 1, 10, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='steg-01'
union all select id, 2, 20, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='steg-01'
union all select id, 1, 15, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='osint-02'
union all select id, 2, 30, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='osint-02'
union all select id, 1, 20, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='web-03'
union all select id, 2, 40, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='web-03'
union all select id, 1, 25, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='net-04'
union all select id, 2, 50, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='net-04'
union all select id, 1, 30, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='crypto-05'
union all select id, 2, 60, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='crypto-05'
union all select id, 1, 40, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='rev-06'
union all select id, 2, 80, 'Intel text is kept out of the repository. Set it in Sentinel Control -> Intel, or run supabase/seed.local.sql.' from public.challenges where slug='rev-06';

-- ---------- evidence files (adjust storage_path to your bucket layout) ----------
delete from public.challenge_files where challenge_id in (select id from public.challenges where slug in
  ('steg-01','osint-02','net-04','crypto-05','rev-06'));

insert into public.challenge_files (challenge_id, display_name, storage_path, size_bytes, sha256)
select id, 'signal_alpha.wav', 'steg-01/signal_alpha.wav', 706864, '96ae4396555dbed42c3a04ceeee5a56de2d7f8c1831a01d34dbdc7ef29ade4c7' from public.challenges where slug='steg-01'
union all select id, 'telemetry_route.log', 'osint-02/telemetry_route.log', null, null from public.challenges where slug='osint-02'
union all select id, 'raw_telemetry_dump.txt', 'net-04/raw_telemetry_dump.txt', null, null from public.challenges where slug='net-04'
union all select id, 'encryptor.py', 'crypto-05/encryptor.py', null, null from public.challenges where slug='crypto-05'
union all select id, 'schematics_key.enc', 'crypto-05/schematics_key.enc', null, null from public.challenges where slug='crypto-05'
union all select id, 'eclipse_daemon', 'rev-06/eclipse_daemon', null, null from public.challenges where slug='rev-06';

-- ---------- access link for the live WEB-03 target (edit the URL after you create the tunnel) ----------
delete from public.challenge_endpoints where challenge_id in (select id from public.challenges where slug='web-03');
insert into public.challenge_endpoints (challenge_id, label, url, kind, note, is_active, sort_order)
select id, 'Primary', 'https://web03.example.com', 'primary', 'Cloudflare Access protected. Authenticate with your allowed email + one-time PIN.', true, 0
from public.challenges where slug='web-03';
