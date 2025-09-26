const fs = require("fs");
const path = require("path");

const FILE = path.join("src","middleware.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-no-logs";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) remove any console.log lines (our [MW] debug or similar)
s = s.replace(/^\s*console\.log\([^)]*\);\s*$/mg, "");

// 2) ensure matcher is limited to admin/api
if (/export\s+const\s+config\s*=/.test(s)) {
  s = s.replace(
    /export\s+const\s+config\s*=\s*{\s*matcher\s*:\s*\[[\s\S]*?\]\s*,?\s*};?/m,
    'export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };'
  );
} else {
  s += '\n\nexport const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };';
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Cleaned logs in", FILE, "Backup:", BAK);
