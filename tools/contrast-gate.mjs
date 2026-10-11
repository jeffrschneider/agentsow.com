// The contrast gate. Opens every page in light and dark, at 1440 and 390 px
// wide, with every collapsible section and the phone menu opened and the
// analytics consent bar showing, and measures the WCAG contrast of every piece
// of text against what is actually behind it (translucent backgrounds are
// composited, SVG text is measured against the shape under it). Exits 1 and
// names page, element and ratio when anything is below 4.5:1.
//
//   node tools/contrast-gate.mjs                 the working tree (git ls-files *.html), served locally
//   node tools/contrast-gate.mjs --root <folder> a folder of pages (deploy.sh's staging folder)
//   node tools/contrast-gate.mjs --base https://dev.agentmesh.ai/   the live site, same page list
//   node tools/contrast-gate.mjs --pages a.html,b.html              only these
//
// deploy.sh runs it before publishing and refuses on a failure.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, extname, resolve } from "node:path";

// playwright from this tools folder (npm ci), or from the folder named in
// PLAYWRIGHT_FROM (a repository that already has it installed).
const { chromium } = createRequire(join(process.env.PLAYWRIGHT_FROM || import.meta.dirname, "x.js"))("playwright");

const FLOOR = 4.5;
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const root = resolve(opt("--root") || ".");
// The tracked pages, or every page in the folder when it is not a git
// repository (deploy.sh's staging folder, which holds only committed files).
const listPages = () => {
  try {
    if (execSync("git rev-parse --show-toplevel", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().replace(/\\/g, "/").toLowerCase() === root.replace(/\\/g, "/").toLowerCase())
      return execSync("git ls-files *.html", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {}
  const out = [];
  (function walk(dir, rel) {
    for (const f of readdirSync(dir)) {
      if (["node_modules", ".git", "tools"].includes(f)) continue;
      const p = join(dir, f), r = rel ? rel + "/" + f : f;
      if (statSync(p).isDirectory()) walk(p, r); else if (f.endsWith(".html")) out.push(r);
    }
  })(root, "");
  return out.sort();
};
let pages = opt("--pages") ? opt("--pages").split(",") : listPages();
// Pages with no visible body of their own: the search-console token and redirect stubs.
pages = pages.filter((p) => {
  if (!existsSync(join(root, p))) return true;
  const s = readFileSync(join(root, p), "utf8");
  return !/http-equiv="refresh"/i.test(s) && !/^google[0-9a-f]+\.html$/.test(p);
});

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
let base = opt("--base"), server = null;
if (!base) {
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = join(root, p);
    if (!f.startsWith(root) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    res.end(readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${server.address().port}/`;
}
if (!base.endsWith("/")) base += "/";

const MEASURE = (floor) => {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => [r, g, b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
  const stops = (img) => (img.match(/rgba?\([^)]+\)/g) || []).map(parse);
  // Every colour the text could be sitting on: the stack of backgrounds up to
  // the first opaque one, composited; a gradient contributes each of its stops.
  const grounds = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const opts = [];
      const c = parse(cs.backgroundColor); if (c && c.a > 0) opts.push(c);
      if (cs.backgroundImage && cs.backgroundImage !== "none") for (const s of stops(cs.backgroundImage)) if (s.a > 0) opts.push(s);
      if (opts.length) { layers.push(opts); if (opts.some((o) => o.a >= 1) && !(cs.backgroundImage !== "none" && opts.some((o) => o.a < 1))) break; }
    }
    let result = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (const opts of layers.reverse()) result = opts.flatMap((o) => result.map((u) => over(o, u)));
    return result.slice(0, 12);
  };
  const svgGround = (el) => {
    const svg = el.ownerSVGElement; if (!svg) return null;
    const t = el.getBoundingClientRect(); const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    let hit = null;
    for (const s of svg.querySelectorAll("rect, circle, ellipse, path, polygon")) {
      if (s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) continue; // drawn after the text
      const r = s.getBoundingClientRect(); if (cx < r.x || cx > r.x + r.width || cy < r.y || cy > r.y + r.height) continue;
      const cs = getComputedStyle(s); const f = parse(cs.fill); if (!f) continue;
      f.a *= (+cs.fillOpacity || 1) * (+cs.opacity || 1); if (f.a > 0) hit = f;
    }
    return hit;
  };
  const name = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase(); if (e.id) { parts.unshift(s + "#" + e.id); break; }
      if (e.classList.length) s += "." + [...e.classList].slice(0, 2).join(".");
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const bad = []; let n = 0, min = null;
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
    const own = [...el.childNodes].filter((x) => x.nodeType === 3 && x.textContent.trim()).map((x) => x.textContent.trim()).join(" ");
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op === 0) continue;
    const isSvg = el instanceof SVGElement;
    const fg = parse(isSvg ? cs.fill : cs.color); if (!fg) continue;
    fg.a *= op * (isSvg ? (+cs.fillOpacity || 1) : 1);
    let gs = grounds(isSvg ? el.ownerSVGElement || el : el);
    if (isSvg) { const g = svgGround(el); if (g) gs = gs.map((u) => over(g, u)); }
    n++;
    let worst = Infinity, wg = null;
    for (const g of gs) { const v = ratio(over(fg, g), g); if (v < worst) { worst = v; wg = g; } }
    const row = () => ({ ratio: +worst.toFixed(2), el: name(el), text: own.slice(0, 50), size: cs.fontSize,
      fg: isSvg ? cs.fill : cs.color, bg: `rgb(${Math.round(wg.r)},${Math.round(wg.g)},${Math.round(wg.b)})` });
    if (worst < floor) bad.push(row());
    if (!min || worst < min.ratio) min = row();
  }
  return { n, bad, min };
};

const browser = await chromium.launch();
const runs = [];
for (const theme of ["light", "dark"]) for (const w of [1440, 390]) runs.push({ theme, w });
const failures = []; let measured = 0, lowest = { ratio: Infinity };
async function check(page, theme, w, ctx) {
  const p = await ctx.newPage();
  try {
    await p.goto(base + page, { waitUntil: "load", timeout: 60000 });
    await p.evaluate(() => document.fonts && document.fonts.ready);
    // Text drawn after load (diagrams rendered by a script) is measured too.
    await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await p.waitForFunction(() => [...document.querySelectorAll("pre.mermaid, div.mermaid")]
      .every((e) => e.querySelector("svg")), null, { timeout: 20000 }).catch(() => {});
    // Measure what a reader sees once things settle, not a fade halfway through.
    await p.addStyleTag({ content: "*,*::before,*::after{transition-duration:0s!important;transition-delay:0s!important;animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important}" });
    await p.evaluate((theme) => {
      if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      const nav = document.getElementById("sidenav"); if (nav) nav.classList.add("open");
    }, theme);
    await p.waitForTimeout(150);
    const { n, bad, min } = await p.evaluate(MEASURE, FLOOR);
    measured += n;
    for (const b of bad) failures.push({ page, theme, w, ...b });
    if (min && min.ratio < lowest.ratio) lowest = { page, theme, w, ...min };
  } finally { await p.close(); }
}
for (const { theme, w } of runs) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, timezoneId: "Europe/Berlin" });
  // never send the gate's visits to Google Analytics
  await ctx.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  const queue = [...pages];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await check(queue.shift(), theme, w, ctx); }));
  await ctx.close();
}
await browser.close();
if (server) server.close();

const where = base.startsWith("http://127.0.0.1") ? root : base;
if (failures.length) {
  failures.sort((a, b) => a.ratio - b.ratio);
  console.error(`CONTRAST GATE: ${failures.length} text element(s) below ${FLOOR}:1 (${where}). Not publishing.`);
  for (const f of failures.slice(0, 200)) console.error(`  ${f.ratio}:1  ${f.page} [${f.theme} ${f.w}px]  ${f.el}  "${f.text}"  ${f.fg} on ${f.bg}`);
  if (failures.length > 200) console.error(`  ... and ${failures.length - 200} more`);
  process.exit(1);
}
console.log(`contrast gate: ${pages.length} pages x light/dark x 1440/390, ${measured} text measurements, none below ${FLOOR}:1. ` +
  `Lowest ${lowest.ratio}:1 (${lowest.page} [${lowest.theme} ${lowest.w}px] "${lowest.text}"). ${where}`);
