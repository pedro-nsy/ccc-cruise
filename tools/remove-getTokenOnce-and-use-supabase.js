// node tools/remove-getTokenOnce-and-use-supabase.js
const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-rm-getTokenOnce";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure we import/create a Supabase client (supabase-js)
if (!/@supabase\/supabase-js/.test(s)) {
  s = s.replace(/"use client";?/, `$&\nimport { createClient } from "@supabase/supabase-js";`);
}
if (!/const\s+supabase\s*=\s*createClient\(/.test(s)) {
  // place the client near the top after type defs, or at top as fallback
  const anchor = /export\s+type\s+UsageRow\s*=\s*\{[\s\S]*?\};/m;
  const clientBlock =
`\nconst supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);\n`;
  if (anchor.test(s)) s = s.replace(anchor, m => m + clientBlock);
  else s = s.replace(/("use client";?.*?\n)/s, `$1${clientBlock}`);
}

// 2) Remove any lazy-require block for getTokenOnce and its declaration
s = s.replace(/let\s+getTokenOnce[\s\S]*?catch\s*\{[\s\S]*?\}\s*/m, "");
s = s.replace(/\bgetTokenOnce\b/g, "/*removed_getTokenOnce*/");

// 3) Replace the effect that still calls getTokenOnce() with supabase.auth.getSession()
s = s.replace(
  /useEffect\(\s*\(\)\s*=>\s*\{\s*let\s+on\s*=\s*true;\s*\/\*removed_getTokenOnce\*\/\(\)\.then\(\s*t\s*=>\s*\{\s*if\s*\(on\)\s*setToken\(t\s*\|\|\s*""\);\s*\}\s*\);\s*return\s*\(\)\s*=>\s*\{\s*on\s*=\s*false;\s*\};\s*\}\s*,\s*\[\]\s*\);\s*/m,
  `useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token || "";
      if (on) setToken(t);
    });
    return () => { on = false; };
  }, []);\n`
);

// If the above exact pattern didn’t match, do a looser replace:
if (/getTokenOnce\(/.test(s)) {
  s = s.replace(
    /useEffect\([\s\S]*?getTokenOnce\([\s\S]*?\},\s*\[\]\s*\);/m,
    `useEffect(() => {
      let on = true;
      supabase.auth.getSession().then(({ data }) => {
        const t = data.session?.access_token || "";
        if (on) setToken(t);
      });
      return () => { on = false; };
    }, []);`
  );
}

// 4) Final safety: remove any stray comment tokens
s = s.replace(/\/\*removed_getTokenOnce\*\//g, "");

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Removed getTokenOnce and switched to supabase.auth.getSession(). Backup:", path.basename(BAK));
