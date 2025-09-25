// node tools/wait-for-token-before-fetch.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-wait-token";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) In fetchList, add an early guard: if no token yet, skip quietly.
s = s.replace(
  /const fetchList = useCallback\(async \(\) => \{([\s\S]*?)\}\s*,\s*\[apiUrl,\s*token\]\);\s*/m,
  (m, body) => {
    if (/if\s*\(!token\)/.test(body)) return m; // already guarded
    const guarded = `
    // wait for token before hitting protected API
    if (!token) { 
      // skip silently; effect will rerun when token arrives
      return; 
    }
${body}`;
    changed = true;
    return `const fetchList = useCallback(async () => {${guarded}}, [apiUrl, token]);\n`;
  }
);

// 2) Also soften the error branch to ignore NO_TOKEN payloads from API (status 200 but ok:false)
s = s.replace(
  /if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*throw new Error\(([^)]*)\);\s*\}/m,
  `if (!res.ok || json?.ok === false) {
        if (!token && (json?.error === "NO_TOKEN" || json?.message === "NO_TOKEN")) { return; }
        throw new Error($1);
      }`
);

if (changed) {
  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Updated useAdminPromos.ts to wait for token and suppress NO_TOKEN noise. Backup:", path.basename(BAK));
} else {
  console.log("No changes applied (guard already present?).");
}
