const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");

function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
function read(p){ try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function listFiles(dir) {
  const out = [];
  (function walk(d){
    for (const e of fs.readdirSync(d, { withFileTypes:true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); }
      else out.push(p);
    }
  })(dir);
  return out;
}

function findStartPage() {
  const candidates = [
    path.join(APP, "booking", "start", "page.tsx"),
    path.join(APP, "booking", "start", "page.jsx"),
    path.join(APP, "booking", "start", "page.ts"),
    path.join(APP, "booking", "start", "page.js"),
  ];
  for (const c of candidates) if (exists(c)) return c;
  // fallback: search for /booking/start files
  const all = listFiles(path.join(APP, "booking"));
  const hit = all.find(p => /[\\/]booking[\\/]start[\\/].*page\.(t|j)sx?$/.test(p));
  return hit || null;
}

function resolveImport(fromFile, spec) {
  // local only: './', '../', or '@/'
  if (spec.startsWith("@/")) {
    const rel = spec.slice(2); // remove '@/'
    const guess = path.join(SRC, rel);
    const extd = tryExts(guess);
    return extd;
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const extd = tryExts(base);
    return extd;
  }
  return null;
}

function tryExts(base) {
  const exts = ["", ".ts", ".tsx", ".js", ".jsx"];
  const idx = ["", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
  for (const e of exts) {
    const p = base + e;
    if (exists(p)) return p;
  }
  for (const i of idx) {
    const p = base + i;
    if (exists(p)) return p;
  }
  return null;
}

function gatherTouchedFiles(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const f = queue.shift();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    const s = read(f);
    const importRe = /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(s))) {
      const spec = m[1];
      const r = resolveImport(f, spec);
      if (r && !seen.has(r)) queue.push(r);
    }
  }
  return Array.from(seen);
}

function scanSignals(files) {
  const hits = {
    session: [],
    cookie: [],
    localStorage: [],
    fetches: [],
    apis: [],
    nav: [],
  };
  const add = (k, f, line, text) => hits[k].push({ file: rel(f), line, text: text.trim() });

  files.forEach(f => {
    const s = read(f);
    const lines = s.split(/\r?\n/);
    lines.forEach((ln, i) => {
      if (/\bcookies?\(/.test(ln) || /from\s+'next\/headers'/.test(ln)) add("cookie", f, i+1, ln);
      if (/\blocalStorage\b/.test(ln)) add("localStorage", f, i+1, ln);
      if (/\bsession\b/.test(ln)) add("session", f, i+1, ln);
      if (/\bfetch\(/.test(ln) || /\baxios\b/.test(ln)) add("fetches", f, i+1, ln);
      const apiMatch = ln.match(/["'`](\/api\/[^"'`]+)["'`]/);
      if (apiMatch) add("apis", f, i+1, apiMatch[1]);
      if (/router\.push\(|redirect\(|Link /.test(ln)) add("nav", f, i+1, ln);
    });
  });
  return hits;
}

function rel(p){ return path.relative(ROOT, p).replace(/\\/g,"/"); }

(function main(){
  console.log("FLOW-01 Scanner\n");
  const startPage = findStartPage();
  if (!startPage) {
    console.error("✗ Could not find /booking/start/page.* under src/app/booking/start/");
    process.exit(2);
  }
  console.log("• Start page:", rel(startPage));

  const touched = gatherTouchedFiles(startPage);
  console.log("\n• Local files touched (imports resolved):");
  touched.forEach(f => console.log("  -", rel(f)));

  const hits = scanSignals(touched);
  function printBlock(title, arr) {
    console.log(`\n• ${title}:`);
    if (!arr.length) return console.log("  (none)");
    arr.forEach(h => console.log(`  - ${h.file}:${h.line}  ${h.text}`));
  }

  printBlock("Session-related (cookies/session/localStorage)", [
    ...hits.cookie, ...hits.session, ...hits.localStorage
  ]);
  printBlock("API endpoints found", hits.apis);
  printBlock("Fetch/axios calls", hits.fetches);
  printBlock("Navigation lines", hits.nav);

  console.log("\n✓ Scan complete. Next steps: visit /booking/start and observe lead behavior.");
})();
