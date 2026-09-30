/* Draws every README SVG in .github/readme/assets/ from content.mjs.
   Adapted from the profile generator (github.com/janiyax35/janiyax35/scripts).
   Run: node .github/readme/build.mjs      (no dependencies, Node 18+) */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C, Doc, svg, chrome, corners, typed, appear, textWidth, wrap, esc, mono } from "./lib.mjs";
import * as K from "./content.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "assets");
mkdirSync(OUT, { recursive: true });

const files = {};
const emit = (name, content) => { files[name] = content; };
const fail = (msg) => { throw new Error(msg); };

/* deterministic PRNG so rebuilding doesn't churn the scramble frames */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const prompt = (x, y, size) =>
  `<text class="m" x="${x}" y="${y}" font-size="${size}" fill="${C.lime}">jd<tspan fill="${C.dim}">:</tspan><tspan fill="${C.cyan}">~</tspan><tspan fill="${C.dim}">$</tspan></text>`;

/* ------------------------------------------------------------------ hero */
function hero() {
  const P = K.project;
  const d = new Doc(), W = 840, H = 300, X = 28;
  const out = [chrome(W, H, `jd@janith: ~/${P.repo}`, P.caseId)];

  // slow CRT scanline drifting down the window
  d.rule(`.scan{animation:scan 7s linear infinite}@keyframes scan{from{transform:translateY(0)}to{transform:translateY(300px)}}`);
  out.push(`<defs><clipPath id="win"><rect x="1" y="37" width="${W - 2}" height="${H - 38}" rx="5"/></clipPath>
<linearGradient id="sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.lime}" stop-opacity="0"/><stop offset=".5" stop-color="${C.lime}" stop-opacity=".05"/><stop offset="1" stop-color="${C.lime}" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#win)"><rect class="scan" x="0" y="-24" width="${W}" height="60" fill="url(#sl)"/></g>`);

  // radar geometry first: everything on the left must stay clear of it
  const cx = 726, cy = 146, R = 74, leftMax = cx - R - 24;

  // $ ./sentinel --brief
  const ps = 14, cw = mono(ps), py = 78;
  out.push(prompt(X, py, ps));
  out.push(typed(d, { x: X + 6 * cw, y: py, text: P.command, size: ps, start: 0.5, dur: 0.9 }));

  // name: scramble -> resolve, then an occasional red/cyan glitch
  const LS = -1.6, full = P.name.join(" ");
  const unit = textWidth(full, "sg-700", 1, LS / 64);
  const NS = Math.min(64, Math.floor((leftMax - X) / unit));
  if (NS < 40) fail(`hero name too long for one line (${NS}px)`);
  const NY = 152;
  const nameText = (fill, extra = "") =>
    `<text class="s" x="${X}" y="${NY}" font-size="${NS}" font-weight="700" letter-spacing="${LS}" ${extra}>${esc(P.name[0])} <tspan fill="${fill}">${esc(P.name[1])}</tspan></text>`;
  const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?@<>/";
  const r = rng(1337), F = 9, t0 = 1.5, step = 0.075;
  d.rule(`@keyframes fr{from,to{opacity:1}}@keyframes hide{from,to{opacity:0}}`);
  for (let k = 0; k < F; k++) {
    const fixed = Math.floor((full.length * k) / F);
    const s = [...full].map((ch, i) => (ch === " " || i < fixed ? ch : glyphs[Math.floor(r() * glyphs.length)])).join("");
    out.push(`<text class="s" x="${X}" y="${NY}" font-size="${NS}" font-weight="700" letter-spacing="${LS}" fill="${C.lime}" fill-opacity=".85" style="opacity:0;animation:fr ${step}s linear ${(t0 + k * step).toFixed(3)}s">${esc(s)}</text>`);
  }
  const reveal = (t0 + F * step).toFixed(3);
  d.rule(`.gl-r,.gl-c{opacity:0;animation:glr 8s linear 4s infinite}.gl-c{animation-name:glc}
@keyframes glr{0%,88%,100%{opacity:0;transform:none}89%{opacity:.8;transform:translate(-4px,0)}91%{opacity:.8;transform:translate(3px,-1px)}92.5%{opacity:0}}
@keyframes glc{0%,88%,100%{opacity:0;transform:none}89%{opacity:.8;transform:translate(4px,1px)}91%{opacity:.8;transform:translate(-3px,0)}92.5%{opacity:0}}
.nm{animation:hide ${reveal}s linear}`);
  out.push(`<g class="gl-r">${nameText(C.red, `fill="${C.red}"`)}</g><g class="gl-c">${nameText(C.cyan, `fill="${C.cyan}"`)}</g>`);
  out.push(`<g class="nm">${nameText(C.lime, `fill="${C.text}"`)}</g>`);

  // tagline
  if (X + textWidth(P.tagline, "jbm-400", 14) > leftMax) fail("hero tagline runs into the radar");
  out.push(`<text class="m ${appear(d, 2.2)}" x="${X}" y="190" font-size="14" fill="${C.muted}">${esc(P.tagline)}</text>`);

  // > module: <item>  — types, holds, erases, next
  const fy = 228, head = `> ${P.focusLabel}`, fx = X + (head.length + 1) * cw;
  const roles = P.focus, PER = roles.length * 3, S = 2.6;
  for (const role of roles) if (fx + (role.length + 1) * cw > leftMax) fail(`focus item too long: ${role}`);
  out.push(`<text class="m ${appear(d, S - 0.2)}" x="${X}" y="${fy}" font-size="${ps}" fill="${C.lime}">&gt;<tspan fill="${C.dim}"> ${esc(P.focusLabel)}</tspan></text>`);
  roles.forEach((role, i) => {
    const n = role.length, dist = (n * cw).toFixed(1), a = (100 / roles.length) * i, span = 100 / roles.length;
    const pct = (v) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;
    const vis = d.keyframes(i === 0
      ? `0%,${pct(span - 0.5)}{opacity:1}${pct(span - 0.49)},100%{opacity:0}`
      : `0%,${pct(a - 0.01)}{opacity:0}${pct(a)},${pct(a + span - 0.5)}{opacity:1}${pct(a + span - 0.49)},100%{opacity:0}`);
    const mv = d.keyframes(`0%${a > 0 ? `,${pct(a)}` : ""}{transform:translateX(0);animation-timing-function:steps(${n},end)}${pct(a + span * 0.2)},${pct(a + span * 0.8)}{transform:translateX(${dist}px);animation-timing-function:steps(${n},end)}${pct(a + span * 0.9)},100%{transform:translateX(0)}`);
    const g = d.id("r"), c = d.id("c");
    d.rule(`.${g}{opacity:${i === 0 ? 1 : 0};animation:${vis} ${PER}s linear ${S}s infinite both}.${c}{transform:translateX(${i === 0 ? dist : 0}px);animation:${mv} ${PER}s linear ${S}s infinite both}`);
    out.push(`<g class="${g}"><text class="m" x="${fx}" y="${fy}" font-size="${ps}" fill="${C.text}">${esc(role)}</text><g class="${c}"><rect x="${fx}" y="${fy - 14}" width="${(n + 1) * cw + 2}" height="19" fill="${C.term}"/><rect x="${fx}" y="${fy - 13}" width="${cw}" height="17" fill="${C.lime}" style="animation:blink 1s steps(1) infinite"/></g></g>`);
  });

  // radar (security project)
  const pt = (deg, rad) => { const t = (deg - 90) * Math.PI / 180; return [(cx + rad * Math.cos(t)).toFixed(2), (cy + rad * Math.sin(t)).toFixed(2)]; };
  const ticks = Array.from({ length: 24 }, (_, i) => { const [x1, y1] = pt(i * 15, R); const [x2, y2] = pt(i * 15, R - (i % 6 ? 4 : 8)); return `M${x1} ${y1}L${x2} ${y2}`; }).join("");
  const wedges = [0.26, 0.16, 0.1, 0.06, 0.03].map((o, i) => {
    const [x1, y1] = pt(-i * 9, R), [x2, y2] = pt(-(i + 1) * 9, R);
    return `<path d="M${cx} ${cy}L${x1} ${y1}A${R} ${R} 0 0 0 ${x2} ${y2}Z" fill="${C.lime}" fill-opacity="${o}"/>`;
  }).join("");
  const [lx, ly] = pt(0, R);
  const R0 = 0.3;
  d.rule(`.sweep{transform-origin:${cx}px ${cy}px;animation:spin 4s linear ${R0}s infinite}@keyframes spin{to{transform:rotate(360deg)}}
.blip{transform-box:fill-box;transform-origin:center;opacity:.25;animation:blip 4s linear infinite both}
@keyframes blip{0%{opacity:1;transform:scale(1.9)}12%{transform:scale(1)}70%,100%{opacity:.25}}`);
  // six blips = six stages
  const blips = [[30, 0.55, C.lime], [92, 0.8, C.cyan], [150, 0.42, C.lime], [205, 0.7, C.amber], [262, 0.5, C.lime], [322, 0.78, C.red]].map(([deg, f, col]) => {
    const [bx, by] = pt(deg, R * f);
    return `<circle class="blip" cx="${bx}" cy="${by}" r="3" fill="${col}" style="animation-delay:${(R0 + (deg / 360) * 4).toFixed(2)}s"/>`;
  }).join("");
  out.push(`<g class="${appear(d, 0.3, 0.6)}">
<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.panel2}" stroke="${C.line2}"/>
<circle cx="${cx}" cy="${cy}" r="${R * 0.66}" fill="none" stroke="${C.line}"/><circle cx="${cx}" cy="${cy}" r="${R * 0.33}" fill="none" stroke="${C.line}"/>
<path d="M${cx - R} ${cy}H${cx + R}M${cx} ${cy - R}V${cy + R}" stroke="${C.line}"/>
<path d="${ticks}" stroke="${C.line2}"/>
<g class="sweep">${wedges}<path d="M${cx} ${cy}L${lx} ${ly}" stroke="${C.lime}" stroke-width="1.5"/></g>
${blips}
<circle cx="${cx}" cy="${cy}" r="2.5" fill="${C.lime}"/>
<text class="m" x="${cx}" y="${cy + R + 22}" text-anchor="middle" font-size="10.5" letter-spacing="1.6" fill="${C.dim}">${esc(P.radarLabel)}</text>
</g>`);

  // status bar
  d.rule(`.ping{transform-box:fill-box;transform-origin:center;animation:ping 2s ease-out infinite}@keyframes ping{from{opacity:.8;transform:scale(1)}to{opacity:0;transform:scale(3)}}`);
  out.push(`<g class="${appear(d, 2.4)}"><path d="M20 252.5H${W - 20}" stroke="${C.line}"/>
<circle class="ping" cx="33" cy="274" r="4" fill="none" stroke="${C.lime}"/><circle cx="33" cy="274" r="4" fill="${C.lime}"/>
<text class="m" x="46" y="278" font-size="12" fill="${C.muted}">${esc(P.status)}</text>
<text class="m" x="${W - 22}" y="278" text-anchor="end" font-size="12" fill="${C.dim}">${esc(P.meta)}</text></g>`);

  emit("hero.svg", svg({
    w: W, h: H, doc: d, fonts: ["jbm-400", "sg-700"],
    title: `${full}: ${P.tagline}`,
    desc: `Animated terminal jd@janith: ~/${P.repo} (${P.caseId}). The command ${P.command} resolves to ${full}. ${P.tagline}. ${P.focusLabel} ${roles.join(", ")}. Radar: ${P.radarLabel}. Status: ${P.status}. ${P.meta}.`,
    body: out.join("\n")
  }));
}

/* --------------------------------------------------------------- buttons */
const ICONS = {
  arrow: (x, y, c) => `<path d="M${x + 2} ${y + 12}L${x + 12} ${y + 2}M${x + 4.5} ${y + 2}H${x + 12}V${y + 9.5}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="square"/>`,
  prompt: (x, y, c) => `<text class="m" x="${x}" y="${y + 11.5}" font-size="13" font-weight="700" fill="${c}">&gt;_</text>`,
  at: (x, y, c) => `<text class="m" x="${x + 1}" y="${y + 12}" font-size="14" font-weight="700" fill="${c}">@</text>`,
  doc: (x, y, c) => `<path d="M${x + 2.5} ${y + .75}h6l3.5 3.5v9h-9.5zM${x + 8.5} ${y + .75}v3.5h3.5M${x + 5} ${y + 7.5}h4.5M${x + 5} ${y + 10.25}h4.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`
};
const iconW = { arrow: 14, prompt: 16, at: 14, doc: 14 };

function button(file, label, icon, primary = false) {
  const d = new Doc(), H = 40, fs = 12, ls = 1.4, pad = 18, gap = 10;
  const tw = textWidth(label.toUpperCase(), "jbm-700", fs, ls) - ls;
  const W = Math.round(pad + iconW[icon] + gap + tw + pad);
  const fg = primary ? C.bg : C.text, ic = primary ? C.bg : C.lime;
  d.rule(`.shine{animation:shine 6s ease-in-out 1s infinite both}@keyframes shine{0%{transform:translateX(0)}25%,100%{transform:translateX(${W + 80}px)}}`);
  const body = `<defs><clipPath id="b"><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="3"/></clipPath>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${primary ? .45 : .09}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="3" fill="${primary ? C.lime : C.panel}" stroke="${primary ? C.lime : C.line2}"/>
${primary ? "" : corners(0.5, 0.5, W - 1, H - 1, C.lime, 7)}
<g clip-path="url(#b)"><rect class="shine" x="-70" y="0" width="60" height="${H}" fill="url(#g)" transform="skewX(-20)"/></g>
${ICONS[icon](pad, 13, ic)}
<text class="m up" x="${pad + iconW[icon] + gap}" y="24.5" font-size="${fs}" font-weight="700" letter-spacing="${ls}" fill="${fg}">${esc(label)}</text>`;
  emit(file, svg({ w: W, h: H, doc: d, fonts: ["jbm-700"], title: label, desc: `${label} button`, body }));
}

/* --------------------------------------------------------- section heads */
/* heads sit on GitHub's own page colour, so they come in two themes */
const HEAD_THEME = {
  dark: { ink: C.text, accent: C.lime, meta: C.dim, rule: C.line2 },
  light: { ink: "#1F2328", accent: "#4F7A00", meta: "#59636E", rule: "#D0D7DE" }
};

function sectionHead(key, theme = "dark") {
  const [idx, title, meta] = K.sections[key];
  const T = HEAD_THEME[theme];
  const d = new Doc(), W = 840, H = 60, ty = 40;
  const tw = textWidth(title, "sg-700", 30, -1);
  const mw = mono(12) * (meta.length + 2);
  const x1 = 50 + tw + 18, x2 = W - 2 - mw - 18, len = x2 - x1;
  if (len < 40) fail(`section head "${title}" leaves no room for the rule`);
  d.rule(`.ln{transform-origin:${x1}px 0;animation:draw 1.1s cubic-bezier(.2,.8,.2,1) .2s both}@keyframes draw{from{transform:scaleX(0)}}
.pk{animation:pk 5s cubic-bezier(.5,0,.5,1) 1.3s infinite both}@keyframes pk{0%{transform:translateX(0);opacity:0}6%{opacity:1}54%{opacity:1}60%,100%{transform:translateX(${(len - 8).toFixed(1)}px);opacity:0}}`);
  const body = `<defs><linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0"><stop offset="0" stop-color="${T.rule}"/><stop offset="1" stop-color="${T.rule}" stop-opacity="0"/></linearGradient></defs>
<rect x=".5" y="19.5" width="34" height="22" rx="2" fill="none" stroke="${T.accent}" stroke-opacity=".45"/>
<text class="m" x="17.5" y="34.5" text-anchor="middle" font-size="12" fill="${T.accent}">${idx}</text>
<text class="s" x="50" y="${ty}" font-size="30" font-weight="700" letter-spacing="-1" fill="${T.ink}">${esc(title)}</text>
<rect class="ln" x="${x1}" y="30" width="${len}" height="1" fill="url(#lg)"/>
<rect class="pk" x="${x1}" y="29.5" width="8" height="2" fill="${T.accent}"/>
<text class="m" x="${W - 2}" y="35" text-anchor="end" font-size="12" fill="${T.meta}"><tspan fill="${T.accent}">$</tspan> ${esc(meta)}</text>`;
  emit(`head-${key}${theme === "light" ? "-light" : ""}.svg`, svg({ w: W, h: H, doc: d, fonts: ["jbm-400", "sg-700"], title: `${idx} ${title}`, desc: `Section ${idx}: ${title}. $ ${meta}`, body }));
}

/* ------------------------------------------------------ stack (nmap scan) */
function stack() {
  const d = new Doc(), W = 840, X = 28, fs = 13, cw = mono(fs), lh = 21;
  const out = [];
  let y = 72;
  out.push(prompt(X, y, fs));
  const cmd = "nmap -sV sentinel-ctf";
  out.push(typed(d, { x: X + 6 * cw, y, text: cmd, size: fs, start: 0.4, dur: 0.9 }));
  let t = 1.6;
  const line = (txt, color = C.dim, dt = 0.12) => {
    y += lh;
    out.push(`<text class="m ${appear(d, t)}" x="${X}" y="${y}" font-size="${fs}" fill="${color}" xml:space="preserve">${txt}</text>`);
    t += dt;
  };
  y += 6;
  line(`Starting Nmap 7.95 ( https://nmap.org )`);
  line(`Nmap scan report for ctf.janith.qzz.io`, C.muted);
  line(`Host is up (0.0038s latency).`, C.dim, 0.3);
  y += lh * 0.5;
  const col = (c) => X + c * cw;
  y += lh;
  out.push(`<g class="${appear(d, t)}" font-size="${fs}" font-weight="700"><text class="m" x="${col(0)}" y="${y}" fill="${C.text}">PORT</text><text class="m" x="${col(11)}" y="${y}" fill="${C.text}">STATE</text><text class="m" x="${col(18)}" y="${y}" fill="${C.text}">SERVICE</text><text class="m" x="${col(32)}" y="${y}" fill="${C.text}">VERSION</text></g>`);
  t += 0.2;
  for (const [port, svc, ver, special] of K.scan) {
    if (svc.length > 13) fail(`service name too long: ${svc}`);
    if (col(32) + textWidth(ver, "jbm-400", fs) > W - X) fail(`version text too long: ${ver}`);
    y += lh;
    out.push(`<g class="${appear(d, t, 0.25)}" font-size="${fs}"><text class="m" x="${col(0)}" y="${y}" fill="${special ? C.red : C.text}">${port}</text><text class="m" x="${col(11)}" y="${y}" fill="${C.lime}">open</text><text class="m" x="${col(18)}" y="${y}" fill="${special ? C.red : C.cyan}">${esc(svc)}</text><text class="m" x="${col(32)}" y="${y}" fill="${C.muted}">${esc(ver)}</text></g>`);
    t += 0.14;
  }
  y += lh * 0.5;
  t += 0.2;
  line(`Service detection performed. <tspan fill="${C.lime}">${K.scan.length} services open</tspan> on 1 host.`, C.dim);
  line(`Nmap done: 1 IP address (1 host up) scanned in 0.38 seconds`, C.dim, 0.3);
  y += lh + 6;
  out.push(`<g class="${appear(d, t, 0.1)}">${prompt(X, y, fs)}<rect x="${X + 6 * cw}" y="${y - 12}" width="${cw}" height="16" fill="${C.lime}" style="animation:blink 1s steps(1) infinite"/></g>`);
  d.once("blink", "@keyframes blink{50%{opacity:0}}@keyframes cur{from,to{opacity:1}}");
  const H = y + 24;
  emit("stack.svg", svg({
    w: W, h: H, doc: d, fonts: ["jbm-400", "jbm-700"],
    title: "Stack as an nmap scan",
    desc: `$ ${cmd}. ` + K.scan.map(([p, s, v]) => `${p} open ${s}: ${v}`).join("; ") + `. ${K.scan.length} services open.`,
    body: chrome(W, H, "nmap — zsh", "stack") + "\n" + out.join("\n")
  }));
}

/* --------------------------------------------------------- feature cards */
function cardLayout(p) {
  const title = wrap(p.title, "sg-700", 20, 370, 2);
  const sum = wrap(p.summary, "sg-500", 13.5, 370, 4);
  return { title, sum, h: 38 + 34 + (title.length - 1) * 24 + 16 + sum.length * 19.5 + 12 + 22 + 60 };
}

function featureCard(p, i, H) {
  const d = new Doc(), W = 410, X = 20, L = cardLayout(p);
  const out = [];
  out.push(`<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.panel}"/><stop offset="1" stop-color="${C.panel2}"/></linearGradient>
<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.lime}" stop-opacity="0"/><stop offset=".5" stop-color="${C.lime}" stop-opacity=".09"/><stop offset="1" stop-color="${C.lime}" stop-opacity="0"/></linearGradient>
<clipPath id="cc"><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="4"/></clipPath></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="4" fill="url(#bg)" stroke="${C.line}"/>`);
  // scan sweep, staggered per card
  d.rule(`.sw{animation:sw 8s cubic-bezier(.4,0,.2,1) ${(1 + i * 1.6).toFixed(1)}s infinite both}@keyframes sw{0%{transform:translateX(0)}18%,100%{transform:translateX(${W + 260}px)}}`);
  out.push(`<g clip-path="url(#cc)"><rect class="sw" x="-240" y="0" width="200" height="${H}" fill="url(#sw)" transform="skewX(-12)"/></g>`);
  out.push(corners(0.5, 0.5, W - 1, H - 1));
  // top strip
  out.push(`<text class="m" x="${X}" y="24" font-size="11" letter-spacing=".9" fill="${C.lime}">${esc(p.id)}</text>
<text class="m up" x="${W - X}" y="24" text-anchor="end" font-size="10.5" letter-spacing=".8" fill="${C.muted}">${esc(p.type)}</text>
<path d="M1 38.5H${W - 1}" stroke="${C.line}"/>`);
  let y = 38 + 34;
  L.title.forEach((ln, k) => out.push(`<text class="s" x="${X}" y="${y + k * 24}" font-size="20" font-weight="700" letter-spacing="-.4" fill="${C.text}">${esc(ln)}</text>`));
  y += (L.title.length - 1) * 24 + 16;
  L.sum.forEach((ln, k) => out.push(`<text class="s" x="${X}" y="${y + 13 + k * 19.5}" font-size="13.5" font-weight="500" fill="${C.muted}">${esc(ln)}</text>`));
  y += L.sum.length * 19.5 + 12;
  // stack chips (all must fit on one row, so the alt text stays true)
  let cx = X;
  for (const s of p.stack) {
    const w = textWidth(s, "jbm-400", 10.5) + 16;
    if (cx + w > W - X) fail(`${p.id}: chips overflow at "${s}"`);
    out.push(`<rect x="${cx + .5}" y="${y + .5}" width="${w}" height="21" rx="2" fill="${C.term}" stroke="${C.line2}"/><text class="m" x="${cx + 8.5}" y="${y + 15}" font-size="10.5" fill="${C.muted}">${esc(s)}</text>`);
    cx += w + 6;
  }
  // metric pinned to the bottom
  const my = H - 22, [mv, ml] = p.metric;
  const vw = textWidth(mv, "sg-700", 28, -0.8);
  if (X + vw + 10 + textWidth(ml.toUpperCase(), "jbm-400", 10, 1) > W - X) fail(`${p.id}: metric label too long`);
  out.push(`<text class="s" x="${X}" y="${my}" font-size="28" font-weight="700" letter-spacing="-.8" fill="${C.lime}">${esc(mv)}</text>
<text class="m up" x="${X + vw + 10}" y="${my}" font-size="10" letter-spacing="1" fill="${C.dim}">${esc(ml)}</text>`);
  emit(`${p.file}.svg`, svg({
    w: W, h: H, doc: d, fonts: ["jbm-400", "sg-500", "sg-700"],
    title: `${p.id}: ${p.title}`,
    desc: `${p.type}. ${p.summary} Tags: ${p.stack.join(", ")}. ${p.metric.join(" ")}.`,
    body: out.join("\n")
  }));
}

/* --------------------------------------------------------- results strip */
function results() {
  const d = new Doc(), W = 840, H = 104, gap = 12, n = K.results.length;
  const tw = (W - gap * (n - 1)) / n;
  const out = [`<rect width="${W}" height="${H}" rx="6" fill="${C.bg}"/>`];
  K.results.forEach(([v, l], i) => {
    const x = i * (tw + gap);
    if (textWidth(l.toUpperCase(), "jbm-400", 10.5, 1.2) > tw - 36) fail(`results label too long: ${l}`);
    out.push(`<g class="${appear(d, 0.2 + i * 0.15)}">
<rect x="${(x + .5).toFixed(1)}" y="8.5" width="${(tw - 1).toFixed(1)}" height="${H - 17}" rx="3" fill="${C.panel}" stroke="${C.line}"/>
<rect x="${(x + .5).toFixed(1)}" y="8.5" width="2" height="${H - 17}" fill="${C.lime}"/>
<text class="s" x="${(x + 20).toFixed(1)}" y="54" font-size="34" font-weight="700" letter-spacing="-1" fill="${C.lime}">${esc(v)}</text>
<text class="m up" x="${(x + 20).toFixed(1)}" y="78" font-size="10.5" letter-spacing="1.2" fill="${C.dim}">${esc(l)}</text></g>`);
  });
  emit("results.svg", svg({
    w: W, h: H, doc: d, fonts: ["jbm-400", "sg-700"],
    title: "Project numbers",
    desc: K.results.map(([v, l]) => `${v} ${l}`).join("; "),
    body: out.join("\n")
  }));
}

/* ---------------------------------------------------------- architecture */
function architecture() {
  const A = K.arch, d = new Doc(), W = 840, H = 356;
  const out = [];
  const tone = { red: C.red, amber: C.amber };

  // trust boundaries
  A.bounds.forEach((b, i) => {
    const col = tone[b.color];
    out.push(`<g class="${appear(d, 0.15 + i * 0.1)}"><rect x="${b.x + .5}" y="${b.y + .5}" width="${b.w}" height="${b.h}" rx="4" fill="none" stroke="${col}" stroke-opacity=".55" stroke-dasharray="5 4"/>
<text class="m" x="${b.x + 12}" y="${b.y + 17}" font-size="10.5" letter-spacing="1.4" fill="${col}">${esc(b.label)}</text></g>`);
  });

  // nodes
  Object.values(A.nodes).forEach((n, i) => {
    const room = n.w - 24;
    if (textWidth(n.label, "jbm-400", 12) > room || textWidth(n.sub, "jbm-400", 11) > room) fail(`node text overflows: ${n.label}`);
    const ly = n.y + (n.h > 50 ? 23 : 20), sy = n.y + (n.h > 50 ? 41 : 37);
    out.push(`<g class="${appear(d, 0.35 + i * 0.07)}"><rect x="${n.x + .5}" y="${n.y + .5}" width="${n.w}" height="${n.h}" rx="3" fill="${C.panel}" stroke="${C.line2}"/>
<text class="m" x="${n.x + 12}" y="${ly}" font-size="12" fill="${C.text}">${esc(n.label)}</text>
<text class="m" x="${n.x + 12}" y="${sy}" font-size="11" fill="${C.dim}">${esc(n.sub)}</text></g>`);
  });

  // edges (drawn after nodes so arrowheads sit on top)
  const head = (x, y, dir, col) => {
    const s = 4.5;
    const p = { r: `${x} ${y}L${x - s} ${y - s * .7}L${x - s} ${y + s * .7}`, l: `${x} ${y}L${x + s} ${y - s * .7}L${x + s} ${y + s * .7}`,
      d: `${x} ${y}L${x - s * .7} ${y - s}L${x + s * .7} ${y - s}`, u: `${x} ${y}L${x - s * .7} ${y + s}L${x + s * .7} ${y + s}` }[dir];
    return `<path d="M${p}Z" fill="${col}"/>`;
  };
  d.rule(`.hot{stroke-dasharray:4 4;animation:dash 1s linear infinite}@keyframes dash{to{stroke-dashoffset:-8}}`);
  const edgeCls = appear(d, 1.0, 0.4);
  const packets = [];
  A.edges.forEach((e) => {
    const col = e.hot ? C.lime : e.faint ? C.dim : C.line2;
    const path = e.pts.map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join("");
    const [ex, ey] = e.pts[e.pts.length - 1];
    out.push(`<g class="${edgeCls}"><path d="${path}" fill="none" stroke="${col}" stroke-width="${e.hot ? 1.5 : 1.2}"${e.hot ? ` class="hot"` : ""}${e.faint ? ` stroke-dasharray="2 3"` : ""}/>${head(ex, ey, e.end, col)}${e.label ? `<text class="m" x="${e.label[0]}" y="${e.label[1]}" text-anchor="middle" font-size="10.5" fill="${C.dim}">${esc(e.label[2])}</text>` : ""}</g>`);
    // packets ride straight horizontal hot edges
    if (e.hot && e.pts.length === 2 && e.pts[0][1] === e.pts[1][1]) {
      const [[x0, y0], [x1]] = e.pts, len = x1 - x0 - 8;
      const k = d.keyframes(`0%{opacity:0;transform:translateX(0)}15%,85%{opacity:1}100%{opacity:0;transform:translateX(${len}px)}`);
      packets.push(`<circle cx="${x0 + 2}" cy="${y0}" r="2.5" fill="${C.lime}" style="animation:${k} 1.6s linear ${(1.4 + packets.length * 0.4).toFixed(1)}s infinite both"/>`);
    }
  });
  out.push(packets.join("\n"));

  // caption
  if (20 + textWidth(A.caption, "jbm-400", 11.5) > W - 20) fail("architecture caption too long");
  out.push(`<text class="m ${appear(d, 1.4)}" x="20" y="${H - 18}" font-size="11.5" fill="${C.dim}">${esc(A.caption)}</text>`);

  const nodes = Object.values(A.nodes);
  emit("architecture.svg", svg({
    w: W, h: H, doc: d, fonts: ["jbm-400"],
    title: "Sentinel CTF architecture",
    desc: `Three zones. ${A.bounds.map((b) => b.label).join(", ")}. Nodes: ${nodes.map((n) => `${n.label} (${n.sub})`).join("; ")}. ` +
      "The browser loads pinned CDN libraries and resolves ctf.janith.qzz.io through Cloudflare DNS, gets static pages from Vercel, signs in directly with Supabase Auth, and sends every flag, hint and admin request to the /api functions. " +
      `The functions read env secrets, verify the user's token with Supabase Auth, query Postgres and sign Storage URLs. ${A.caption}.`,
    body: chrome(W, H, "architecture — sentinel-ctf", "request flow") + "\n" + out.join("\n")
  }));
}

/* ---------------------------------------------------------------- footer */
function footer() {
  const d = new Doc(), W = 840, name = K.project.name.join(" ");
  const unit = textWidth(name, "sg-700", 1, -0.05);
  const fs = Math.floor((W - 40) / unit), ls = (-0.05 * fs).toFixed(2);
  const base = Math.round(fs * 0.78) + 22, H = Math.round(fs * 0.8) + 36;
  d.rule(`.spot{animation:spot 11s ease-in-out infinite alternate both}@keyframes spot{from{transform:translateX(-360px)}to{transform:translateX(360px)}}`);
  const txt = (attrs) => `<text class="s" x="${W / 2}" y="${base}" text-anchor="middle" font-size="${fs}" font-weight="700" letter-spacing="${ls}" ${attrs}>${esc(name)}</text>`;
  const body = `<defs>
<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151C25"/><stop offset=".75" stop-color="#0B0E13"/></linearGradient>
<linearGradient id="fadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity=".5"/><stop offset=".92" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeG)"/></mask>
<radialGradient id="sp"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="spot" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><circle class="spot" cx="${W / 2}" cy="${H / 2}" r="170" fill="url(#sp)"/></mask>
</defs>
<rect width="${W}" height="${H}" rx="6" fill="${C.bg}"/>
<g mask="url(#fade)">
${txt(`fill="url(#fill)" stroke="#1E2630" stroke-width="1"`)}
<g mask="url(#spot)">${txt(`fill="${C.lime}" fill-opacity=".16" stroke="${C.lime}" stroke-width="1.5"`)}</g>
</g>`;
  emit("footer.svg", svg({ w: W, h: H, doc: d, fonts: ["sg-700"], title: name, desc: `${name} in giant outlined letters with a slowly moving lime spotlight.`, body }));
}

/* ------------------------------------------------------------------ run */
hero();
button("btn-live.svg", "live platform", "arrow", true);
button("btn-case.svg", "case file", "prompt");
button("btn-setup.svg", "setup guide", "doc");
button("btn-email.svg", "email", "at");
for (const key of Object.keys(K.sections)) { sectionHead(key); sectionHead(key, "light"); }
results();
const cardH = Math.ceil(Math.max(...K.features.map((p) => cardLayout(p).h)));
K.features.forEach((p, i) => featureCard(p, i, cardH));
architecture();
stack();
footer();

/* checks: size budget + only the characters the embedded fonts contain */
const ALLOWED = new Set(["·", "–", "—", "’", "…"]);
let bad = 0;
for (const [name, content] of Object.entries(files)) {
  const kb = Buffer.byteLength(content) / 1024;
  const limit = name === "hero.svg" ? 40 : 60;
  const visible = content.replace(/<style>[\s\S]*?<\/style>/, "");
  const odd = [...new Set([...visible].filter((ch) => ch.charCodeAt(0) > 126 && !ALLOWED.has(ch)))];
  const flag = kb > limit ? `  OVER BUDGET (${limit} KB)` : odd.length ? `  BAD CHARS: ${odd.join(" ")}` : "";
  if (flag) bad++;
  writeFileSync(join(OUT, name), content);
  console.log(`${name.padEnd(28)} ${kb.toFixed(1).padStart(5)} KB${flag}`);
}
if (bad) { console.error(`\n${bad} file(s) failed the checks`); process.exit(1); }
console.log(`\n${Object.keys(files).length} files, all within budget`);
