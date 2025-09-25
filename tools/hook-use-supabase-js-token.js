// node tools/hook-use-supabase-js-token.js
const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","hooks","useAdminPromos.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-token-source-swap";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE,"utf8");

// 1) Ensure we import createClient from @supabase/supabase-js
if (!/@supabase\/supabase-js/.test(s)) {
  s = s.replace(/"use client";?\s*/, m => `${m}\nimport { createClient } from "@supabase/supabase-js";\n`);
}

// 2) Remove the auth-helpers lazy require block (if present)
s = s.replace(/let\s+getTokenOnce[\s\S]*?catch\s*\{[\s\S]*?\}\s*/m, "");

// 3) Insert a real Supabase client and token fetch effect
if (!/const\s+supabase\s*=\s*createClient\(/.test(s)) {
  s = s.replace(
    /export\s+type\s+UsageRow[\s\S]*?\};/,
    m => `${m}\n\nconst supabase = createClient(\n  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n);\n`
  );
}

// 4) Replace the old "Get token once" effect with one that uses supabase-js
s = s.replace(
  /\/\/\s*Get token once[\s\S]*?}\);\s*\n\s*},\s*\[\]\);\s*/m,
  `// Get token once (client-side)
  useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token || "";
      if (on) setToken(t);
    });
    return () => { on = false; };
  }, []);\n`
);

// 5) Ensure fetchList waits for token and then fetches with it.
//    Remove any prior "allow without token" guard we added earlier.
s = s.replace(
  /const fetchList = useCallback\(async \(\) => \{\s*([\s\S]*?)\}, \[apiUrl, token\]\);/m,
  (_m, body) => {
    const guarded = `
    // wait for token before hitting protected API
    if (!token) return;
${body.replace(/credentials:\s*"include",\s*/g,"")} // credentials not needed if JWT is sent
`.trim();
    return `const fetchList = useCallback(async () => {\n${guarded}\n}, [apiUrl, token]);`;
  }
);

// 6) Make sure we actually send the Authorization header with the token
s = s.replace(
  /fetch\(\s*apiUrl\s*,\s*\{\s*([^}]*)\}\s*\)/m,
  (m, inner) => {
    // inject headers with bearer (merge-friendly)
    let next = inner;
    if (!/headers\s*:/.test(next)) {
      next = `headers: { authorization: \`Bearer \${token}\` },\n      ` + next;
    } else {
      // upgrade any existing headers object to include Authorization
      next = next.replace(
        /headers\s*:\s*\{([^}]*)\}/m,
        (m2, h) => `headers: { ${h.trim()}${h.trim() ? "," : ""} authorization: \`Bearer \${token}\` }`
      );
    }
    // strip credentials: "include" if present (not needed when using JWT)
    next = next.replace(/credentials\s*:\s*["']include["']\s*,?\s*/g,"");
    return `fetch(apiUrl, {\n      ${next}\n    })`;
  }
);

// 7) Stop swallowing NO_TOKEN silently; if it happens now, it means no session.
s = s.replace(
  /if\s*\(!res\.ok\s*\|\|\s*json\?\.\ok\s*===\s*false\)\s*\{\s*if\s*\(json\?\.\s*error\s*===\s*["']NO_TOKEN["'][^}]*\}\s*/m,
  `if (!res.ok || json?.ok === false) { throw new Error(json?.error || json?.message || "Failed to load promos"); }`
);

// 8) In the catch, keep Abort quiet but log others
s = s.replace(
  /if\s*\(e\?\.\s*name\s*!==\s*["']AbortError["']\)\s*console\.error\([^)]*\);/m,
  'if (e?.name !== "AbortError") console.error("Load promos failed:", e?.message || e);'
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Hook now uses supabase-js to get JWT and fetches only after token is ready. Backup:", path.basename(BAK));
