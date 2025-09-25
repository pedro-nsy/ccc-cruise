// node tools/fetch-include-credentials-and-quiet-no-token.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
const BAK = FILE + ".bak-cred-notoken";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Ensure we send cookies/magic-link session with the fetch
//    Add `credentials: "include",` inside the fetch options for the LIST call.
s = s.replace(
  /fetch\(\s*apiUrl\s*,\s*\{\s*([^}]*)\}\s*\)/m,
  (m, inner) => {
    if (/credentials\s*:/.test(inner)) return m;
    changed = true;
    const updated = inner
      // keep header/signal etc., just inject credentials at top
      .replace(/^\s*/, 'credentials: "include",\n      ');
    return `fetch(apiUrl, {\n      ${updated}\n    })`;
  }
);

// 2) Do not throw/log when backend replies NO_TOKEN
//    (a) Inside error branch after parsing json
s = s.replace(
  /if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*throw new Error\(([^)]*)\);\s*\}/m,
  `if (!res.ok || json?.ok === false) {
        if (json?.error === "NO_TOKEN" || json?.message === "NO_TOKEN" || res.status === 401 || res.status === 403) { return; }
        throw new Error($1);
      }`
);

//    (b) In catch: ignore NO_TOKEN messages
s = s.replace(
  /if\s*\(e\?\.\s*name\s*!==\s*["']AbortError["']\)\s*console\.error\(\s*["']Load promos failed:\s*["']\s*,\s*e\?\.\s*message\s*\|\|\s*e\s*\);/,
  'if (e?.name !== "AbortError" && e?.message !== "NO_TOKEN") console.error("Load promos failed:", e?.message || e);'
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Added credentials: 'include' and suppressed NO_TOKEN noise. Backup:", path.basename(BAK));
