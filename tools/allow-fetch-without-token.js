// node tools/allow-fetch-without-token.js
const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-no-wait-token";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Remove the early "if (!token) return" guard inside fetchList
s = s.replace(
  /\/\/\s*wait for token[^]*?return;\s*\}\r?\n/m,
  (m) => { changed = true; return ""; }
);

// 2) Make sure we build headers conditionally but never block the request
// (Already true in your file, but this normalizes both code paths.)
s = s.replace(
  /headers:\s*token\s*\?\s*\{\s*authorization:\s*`Bearer\s*\$\{token\}`\s*\}\s*:\s*\{\s*\}/g,
  'headers: token ? { authorization: `Bearer ${token}` } : {}'
);

// 3) Soften NO_TOKEN errors (keep quiet if backend replies with that string)
s = s.replace(
  /if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*([^}]*)\}/m,
  (m, body) => {
    changed = true;
    return `if (!res.ok || json?.ok === false) {
      if (json?.error === "NO_TOKEN" || json?.message === "NO_TOKEN") { return; }
      ${body}
    }`;
  }
);

if (!changed) {
  console.log("No matching token-guard found; file may already allow unauthenticated fetches.");
} else {
  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Fetch no longer waits for JWT; will call API with or without token. Backup:", path.basename(BAK));
}
