// node tools/fix-hook-window-and-unauth.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src", "app", "admin", "promos", "hooks", "useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-window-unauth";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Replace the apiUrl useMemo to build a RELATIVE string (no window)
const apiUrlStart = /const\s+apiUrl\s*=\s*useMemo\(\s*\(\)\s*=>\s*\{\s*[^]*?return\s+u;?\s*\}\s*,\s*\[[^\]]*\]\s*\);/m;
if (apiUrlStart.test(s)) {
  s = s.replace(apiUrlStart, `
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q0) params.set("q", q0);
    if (type0 && type0 !== "all") params.set("type", type0);
    if (status0 && status0 !== "all") params.set("status", status0);
    if (used0 && used0 !== "all") params.set("used", used0);
    params.set("sort", sort0);
    params.set("dir", dir0);
    params.set("page", String(page0));
    params.set("limit", String(limit0));
    return "/api/admin/promos?" + params.toString();
  }, [q0, type0, status0, used0, sort0, dir0, page0, limit0]);
  `);
  changed = true;
} else {
  console.log("i Could not match apiUrl block; skipping (maybe already string-based).");
}

// 2) Ensure fetchList uses fetch(apiUrl) (without .toString())
s = s.replace(/fetch\(\s*apiUrl\.toString\(\)\s*,/g, "fetch(apiUrl,");
s = s.replace(/fetch\(\s*apiUrl\.toString\(\)\s*\)/g, "fetch(apiUrl)");
changed = true;

// 3) Handle early 401 without token: if NO token and 401, quietly return (will refetch once token arrives)
const fetchGuardRe = /const\s+res\s*=\s*await\s+fetch\([^)]*\);\s*const\s+json\s*=\s*await\s+res\.json\(\)\.catch\(\(\)\s*=>\s*\(\{\}\)\);\s*if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*throw\s+new\s+Error\([^}]*\);\s*\}/m;
if (fetchGuardRe.test(s)) {
  s = s.replace(fetchGuardRe, `
      const res = await fetch(apiUrl, {
        headers: token ? { authorization: \`Bearer \${token}\` } : {},
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        // If the API is protected and we have no token yet, skip error and let the next pass (with token) load.
        if (res.status === 401 && !token) return;
        throw new Error(json?.error || json?.message || "Failed to load promos");
      }
  `);
  changed = true;
} else {
  // More generic patch: inject a small 401 guard after a generic fetch(..)
  s = s.replace(/const\s+json\s*=\s*await\s+res\.json\(\)\.catch\(\(\)\s*=>\s*\(\{\}\)\);\s*if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{[^}]*\}/m, (m) => {
    if (m.includes("401") || m.includes("!token")) return m;
    return m.replace(/\}$/, `
        if (res.status === 401 && !token) { return; }
      }`);
  });
  changed = true;
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched useAdminPromos.ts to avoid window/SSR and to skip early 401 without token. Backup:", path.basename(BAK));
