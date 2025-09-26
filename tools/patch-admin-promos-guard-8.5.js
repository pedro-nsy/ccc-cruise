const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-8.5-guard";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Remove import of createClient from supabase-js
s = s.replace(/^\s*import\s*\{\s*createClient\s*\}\s*from\s*["']@supabase\/supabase-js["'];?\s*\r?\n/m, "");

// 2) Remove the supabase client init block
s = s.replace(
  /\s*const\s+supabase\s*=\s*createClient\([\s\S]*?\);\s*\r?\n/m,
  ""
);

// 3) Remove the auth-guard useEffect block that redirects to /admin/login
s = s.replace(
  /\/\/\s*---\s*Keep your existing auth guard behavior[\s\S]*?useEffect\([\s\S]*?\{\s*alive\s*=\s*false;\s*\};\s*\},\s*\[\]\);\s*/m,
  ""
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", BAK);
