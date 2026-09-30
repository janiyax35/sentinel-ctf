/* Shared helpers for every generated SVG: palette, embedded fonts,
   text measuring, and the little animation registry.

   Animation rule used everywhere: an element's normal style is its FINAL
   state, and keyframes animate *from* the hidden/start state with
   `fill-mode: both`. So when a viewer has reduced motion turned on
   (animations disabled), every SVG still shows its complete content. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");

/* same tokens as janith.qzz.io (css/style.css :root) */
export const C = {
  bg: "#0A0D12", term: "#080B0F", panel: "#10151C", panel2: "#0D1117",
  line: "#1C242E", line2: "#2A3542",
  text: "#E6EDF3", muted: "#8A97A5", dim: "#55616E",
  lime: "#B6FF3B", red: "#FF4D5E", cyan: "#3BD4FF", amber: "#FFB020"
};

/* JetBrains Mono + Space Grotesk, subset to ASCII (+ · – — ’ …), OFL-1.1 */
const FACES = {
  "jbm-400": ["JBM", 400], "jbm-700": ["JBM", 700],
  "sg-500": ["SG", 500], "sg-700": ["SG", 700]
};
const metrics = JSON.parse(readFileSync(join(FONT_DIR, "metrics.json"), "utf8"));

function fontFaces(keys) {
  return keys.map((k) => {
    const [family, weight] = FACES[k];
    const b64 = readFileSync(join(FONT_DIR, `${k}.woff2`)).toString("base64");
    return `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  }).join("");
}

/* rendered width of `str` in px; `ls` = letter-spacing in px */
export function textWidth(str, font, size, ls = 0) {
  const m = metrics[font];
  let w = 0;
  for (const ch of str) w += (m.w[ch] ?? m.w["?"]) / m.upm * size + ls;
  return w;
}

/* greedy word wrap; returns an array of lines */
export function wrap(str, font, size, maxW, maxLines = Infinity) {
  const lines = [];
  let cur = "";
  for (const word of str.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, font, size) > maxW) { lines.push(cur); cur = word; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,.;:]*\S*$/, "…");
    return kept;
  }
  return lines;
}

export const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const mono = (size) => size * 0.6; // JetBrains Mono advance = 600/1000 em

/* Collects keyframes/classes while a single SVG is being built. */
export class Doc {
  constructor() { this.css = []; this.n = 0; this.seen = new Set(); }
  id(p = "a") { return `${p}${(this.n++).toString(36)}`; }
  rule(css) { this.css.push(css); }
  /* add a shared rule only the first time it's asked for */
  once(key, css) { if (!this.seen.has(key)) { this.seen.add(key); this.css.push(css); } }
  /* one-off keyframes; returns the generated name */
  keyframes(body) {
    const name = this.id("k");
    this.css.push(`@keyframes ${name}{${body}}`);
    return name;
  }
}

export function svg({ w, h, title, desc, fonts = [], doc, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>${fontFaces(fonts)}
.m{font-family:JBM,ui-monospace,"Cascadia Code",Consolas,monospace}
.s{font-family:SG,system-ui,-apple-system,"Segoe UI",sans-serif}
.up{text-transform:uppercase}
${doc ? doc.css.join("\n") : ""}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${body}
</svg>
`;
}

/* terminal window frame (matches .term / .term__chrome on the site) */
export function chrome(w, h, title, hint = "") {
  return `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="6" fill="${C.term}" stroke="${C.line}"/>
<path d="M.5 36.5V6.5a6 6 0 0 1 6-6h${w - 13}a6 6 0 0 1 6 6v30z" fill="${C.panel}"/>
<path d="M1 36.5h${w - 2}" stroke="${C.line}"/>
<circle cx="20" cy="18.5" r="5.5" fill="#FF5F57"/><circle cx="38" cy="18.5" r="5.5" fill="#FEBC2E"/><circle cx="56" cy="18.5" r="5.5" fill="#28C840"/>
<text class="m" x="${w / 2}" y="22.5" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(title)}</text>
${hint ? `<text class="m" x="${w - 18}" y="22.5" text-anchor="end" font-size="11" fill="${C.dim}">${esc(hint)}</text>` : ""}`;
}

/* lime corner brackets (matches .panel::before / ::after) */
export function corners(x, y, w, h, color = C.lime, s = 10) {
  return `<path d="M${x} ${y + s}V${y}h${s}M${x + w} ${y + h - s}V${y + h}h${-s}" fill="none" stroke="${color}"/>`;
}

/* Typing effect: text is hidden by a cover rect (in `bg`) carrying a
   block cursor; the cover steps right one character at a time. */
export function typed(doc, { x, y, text, size, start, dur, bg = C.term, color = C.text, cursor = C.lime, keepCursor = false, cls = "m" }) {
  const cw = mono(size), n = text.length, dist = n * cw;
  const move = doc.keyframes(`from{transform:translateX(0)}to{transform:translateX(${dist}px)}`);
  const g = doc.id("t");
  // resting position = fully typed, so the text shows when motion is off
  doc.rule(`.${g}{transform:translateX(${dist}px);animation:${move} ${dur}s steps(${n},end) ${start}s both}`);
  const blink = keepCursor
    ? `animation:blink 1s steps(1) ${start + dur}s infinite`
    : `opacity:0;animation:cur ${start + dur}s steps(1)`;
  doc.once("blink", "@keyframes blink{50%{opacity:0}}@keyframes cur{from,to{opacity:1}}");
  const top = y - size * 0.95, hgt = size * 1.3;
  return `<text class="${cls}" x="${x}" y="${y}" font-size="${size}" fill="${color}" xml:space="preserve">${esc(text)}</text>
<g class="${g}"><rect x="${x}" y="${top}" width="${dist + cw + 2}" height="${hgt}" fill="${bg}"/><rect x="${x}" y="${top + 1}" width="${cw}" height="${hgt - 2}" fill="${cursor}" style="${blink}"/></g>`;
}

/* class that fades + lifts an element in after `t` seconds */
export function appear(doc, t, d = 0.35) {
  doc.once("rise", "@keyframes rise{from{opacity:0;transform:translateY(4px)}}");
  const cls = doc.id("p");
  doc.rule(`.${cls}{animation:rise ${d}s ease-out ${t}s both}`);
  return cls;
}
