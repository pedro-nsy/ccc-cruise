const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","api","admin","promos","[id]","route.ts");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}

let s = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".bak-actor-context";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

// 1) Ensure we import createClient
if (!s.includes('from "@supabase/supabase-js"')) {
  s = s.replace(
    /^(import\s+{[^}]*}\s+from\s+"next\/server";\s*[\r\n]+)/,
    (m) => m + 'import { createClient } from "@supabase/supabase-js";\n'
  );
}

// 2) Replace the supabaseServer() line with a client bound to Authorization header (fallback to server)
s = s.replace(
  /const\s+supabase\s*=\s*supabaseServer\(\);\s*/,
  `const authHeader = req.headers.get("authorization") || "";
  const supabase = authHeader
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
    : supabaseServer();
  `
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched PATCH route to carry caller JWT to DB. Backup:", bak);
