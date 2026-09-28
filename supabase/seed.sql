-- ============================================================================
-- SENTINEL CTF — seed content (6 stages, hints, files, access links).
-- Run AFTER schema.sql. Safe to re-run: it upserts by slug.
--
-- FLAGS ARE NOT SEEDED HERE. Flag HMACs need the secret FLAG_PEPPER, which only
-- lives in the server environment. After deploying, set each flag from the
-- admin console (Challenges -> key icon). Flags to enter (inside the braces):
--   STEG-01    Eclipse{ph4s3_c4nc3ll4t10n_succ3ss}   (decoy: Eclipse{f4k3_sp3ctr0gr4m_tr4p})
--   OSINT-02   Eclipse{horton_relay_station}         (case-insensitive)
--   WEB-03     Eclipse{sql1_byp4ss_0bs3rv4t0ry_st4g1ng}
--   NET-04     Eclipse{c0v3rt_h3x_p4ck3t_str34m_d3c0d3d}
--   CRYPTO-05  Eclipse{prng_s33d_x0r_r3v3rs3d_succ3ss}
--   REV-06     Eclipse{d3c0mp1l3d_3lf_k1llsw1tch_st0pp3d}
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
select id, 1, 10, 'Not everything visible in the spectrogram is genuine. Inspect the file metadata with command-line forensic utilities.' from public.challenges where slug='steg-01'
union all select id, 2, 20, 'Two opposite waves of identical frequency cancel each other out. Look into Audacity''s "Invert" effect.' from public.challenges where slug='steg-01'
union all select id, 1, 15, 'Paste the raw coordinates into a GPS visualisation tool or Google Earth to trace the route from start to destination.' from public.challenges where slug='osint-02'
union all select id, 2, 30, 'The final waypoint sits directly on a satellite transmission facility. Format the flag lowercase with underscores.' from public.challenges where slug='osint-02'
union all select id, 1, 20, 'Analyse how the login form handles a single quote (''). Is user input sanitised?' from public.challenges where slug='web-03'
union all select id, 2, 40, 'Classic SQL authentication bypasses use boolean logic and comments, like '' OR 1=1--' from public.challenges where slug='web-03'
union all select id, 1, 25, 'The file is raw hex wrapped in log headers. Strip the headers before reconstruction.' from public.challenges where slug='net-04'
union all select id, 2, 50, 'Use xxd -r -p or Wireshark''s text2pcap to build a readable .pcap, then follow the TCP stream.' from public.challenges where slug='net-04'
union all select id, 1, 30, 'Inspect how random.seed() is initialised in encryptor.py. The keyspace is far smaller than it appears.' from public.challenges where slug='crypto-05'
union all select id, 2, 60, 'You already know the first 8 plaintext bytes (Eclipse{). Use that to test candidate seeds.' from public.challenges where slug='crypto-05'
union all select id, 1, 40, 'strings will fail due to obfuscation. Trace function calls in Ghidra or with ltrace.' from public.challenges where slug='rev-06'
union all select id, 2, 80, 'Set a GDB breakpoint just before the string comparison to read the plain value from memory.' from public.challenges where slug='rev-06';

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
