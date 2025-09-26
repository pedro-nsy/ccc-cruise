const fs = require("fs");
const path = require("path");

function backup(file, tag){
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function patchMiddleware() {
  const FILE = path.join("src", "middleware.ts");
  if (!fs.existsSync(FILE)) { console.log("! Skip middleware.ts (not found)"); return; }
  const BAK = backup(FILE, "auth-cookie-bridge");

  let s = fs.readFileSync(FILE, "utf8");

  // Fix Bearer regex: /^Bearers+.+/i  ->  /^Bearer\s+.+/i
  s = s.replace(/return\s*\/\^Bearers\+\.\+\s*\/i\.test\(h\);/g, 'return /^Bearer\\s+.+/i.test(h);');

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched middleware.ts     Backup:", BAK);
}

function patchAdminAuth() {
  const FILE = path.join("src","lib","adminAuth.ts");
  if (!fs.existsSync(FILE)) { console.log("! Skip adminAuth.ts (not found)"); return; }
  const BAK = backup(FILE, "auth-cookie-bridge");

  let s = fs.readFileSync(FILE, "utf8");

  // Ensure we import ADMIN_COOKIE_NAME and verify from adminSession
  if (!/from\s+["']@\/lib\/adminSession["']/.test(s)) {
    s = s.replace(
      /import\s+{[^}]*}\s+from\s+["']@\/lib\/supabase-server["'];?/,
      (m) => m + `\nimport { ADMIN_COOKIE_NAME, verify as verifyAdminCookie } from "@/lib/adminSession";`
    );
  } else {
    // If already present but without the alias, ensure verify alias exists (harmless if duplicate)
    s = s.replace(
      /import\s+{([^}]*)}\s+from\s+["']@\/lib\/adminSession["'];?/,
      (m, g1) => {
        let names = g1.split(",").map(x => x.trim()).filter(Boolean);
        if (!names.includes("ADMIN_COOKIE_NAME")) names.push("ADMIN_COOKIE_NAME");
        // keep verify but alias in code use
        if (!/verify\b/.test(g1)) names.push("verify as verifyAdminCookie");
        else if (!/verify\s+as\s+verifyAdminCookie/.test(g1)) names = names.map(n => n === "verify" ? "verify as verifyAdminCookie" : n);
        return `import { ${names.join(", ")} } from "@/lib/adminSession";`;
      }
    );
  }

  // Replace the whole requireAdmin function with a version that accepts Bearer OR cookie
  const fnRe = /export\s+async\s+function\s+requireAdmin\s*\([\s\S]*?\)\s*{\s*[\s\S]*?^\}/m;
  if (!fnRe.test(s)) {
    console.log("! Could not find requireAdmin() to replace. Aborting adminAuth.ts patch.");
  } else {
    const replacement = `export async function requireAdmin(req: NextRequest): Promise<{ user: AdminUser } | { error: NextResponse }> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\\s+(.+)$/i);
  const supabase = supabaseServer();

  // --- 1) Try Supabase Bearer first (current behavior) ---
  if (m) {
    const accessToken = m[1];
    const { data: userRes, error: uErr } = await supabase.auth.getUser(accessToken);
    if (!uErr && userRes?.user?.email) {
      const email = userRes.user.email.toLowerCase();
      // Allow if app_metadata.role === 'admin'
      const role = (userRes.user.app_metadata as any)?.role;
      if (role === "admin") return { user: { id: userRes.user.id, email } };

      // Or if email is on the admins allowlist
      const { data: row, error: aErr } = await supabase
        .from("admins")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (!aErr && row) return { user: { id: userRes.user.id, email } };
      // fallthrough to cookie check below
    }
    // If Bearer provided but invalid/not admin → we still attempt cookie next
  }

  // --- 2) Cookie-based admin (Option 1) ---
  try {
    const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const sessionId = verifyAdminCookie(cookieVal || "");
    if (sessionId) {
      // Treat signed cookie as admin proof (you gate issuance elsewhere)
      return { user: { id: \`cookie:\${sessionId}\`, email: "admin@local" } };
    }
  } catch (e) {
    // ignore and fall through
  }

  // No valid bearer and no valid cookie
  return { error: NextResponse.json({ ok: false, error: "NO_TOKEN" }, { status: 401 }) };
}`;
    s = s.replace(fnRe, replacement);
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched adminAuth.ts      Backup:", BAK);
}

patchMiddleware();
patchAdminAuth();
