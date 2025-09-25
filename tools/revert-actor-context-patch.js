const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","admin","promos","[id]","route.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

const bak = FILE + ".bak-actor-context";
let s = fs.readFileSync(FILE, "utf8");

// If we have the backup from the earlier patch, restore it verbatim.
if (fs.existsSync(bak)) {
  fs.copyFileSync(bak, FILE);
  console.log("✓ Reverted using backup:", bak);
  process.exit(0);
}

// Otherwise, patch the file in-place: remove the anon client w/ Authorization header and go back to supabaseServer()
let changed = 0;

// Remove any createClient import we injected (keep file tidy if it’s unused)
if (s.includes('from "@supabase/supabase-js"')) {
  s = s.replace(/import\s*\{\s*createClient\s*\}\s*from\s*["']@supabase\/supabase-js["'];?\s*\n?/, "");
  changed++;
}

// Replace the injected authHeader/anon client block with supabaseServer();
s = s.replace(
  /const\s+authHeader\s*=\s*req\.headers\.get\("authorization"\)[\s\S]*?supabaseServer\(\);\s*/m,
  "const supabase = supabaseServer();\n"
) || s;

// Also handle the variant where only the anon client was present
s = s.replace(
  /const\s+supabase\s*=\s*createClient\([\s\S]*?\);\s*/m,
  "const supabase = supabaseServer();\n"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Reverted route.ts to use supabaseServer()");
