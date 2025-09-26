const fs = require("fs"), path = require("path");
const FILE = path.join("middleware.ts");
if (!fs.existsSync(FILE)) { console.error("middleware.ts not found"); process.exit(1); }
const bak = FILE + ".bak-8.3-dbg"; if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
let s = fs.readFileSync(FILE, "utf8");

// Inject a log inside middleware()
if (!/\[MW\]\s*hit:/.test(s)) {
  s = s.replace(/export\s+function\s+middleware\s*\(\s*req\s*:\s*NextRequest\s*\)\s*{/, 
    m => m + `\n  console.log("[MW] hit:", req.nextUrl.pathname);\n`);
}

// Force-catch all paths (for 1 minute)
if (!/matcher:\s*\[\s*["']\/:path\*["']\s*\]/.test(s)) {
  s = s.replace(/export\s+const\s+config\s*=\s*{\s*matcher\s*:\s*\[[\s\S]*?\]\s*,?\s*};?/m,
                'export const config = { matcher: ["/:path*"] };');
  if (!/export\s+const\s+config\s*=/.test(s)) s += '\n\nexport const config = { matcher: ["/:path*"] };';
}
fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched", FILE, "Backup:", bak);
