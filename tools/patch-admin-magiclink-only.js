const fs = require("fs");
const path = require("path");

function backup(file, tag){
  const bak = file + `.bak-${tag}`;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function patchMiddleware() {
  const FILE = path.join("src","middleware.ts");
  if (!fs.existsSync(FILE)) { console.log("! Skip (middleware not found):", FILE); return; }
  const BAK = backup(FILE, "magiclink-only");

  let s = fs.readFileSync(FILE, "utf8");

  // 1) Make hasBearer match "Authorization: Bearer <...>"
  s = s.replace(
    /function\s+hasBearer\([\s\S]*?\)\s*\{\s*[\s\S]*?return\s*\/\^Bearers\+\.\+\/i\.test\(h\);\s*\}/m,
    `function hasBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return /^Bearer\\s+.+/i.test(h);
}`
  );

  // 2) In middleware(), allow all admin pages (no gate), but require Bearer for admin APIs.
  s = s.replace(
    /export\s+function\s+middleware\([\s\S]*?\)\s*\{[\s\S]*?^\}/m,
    `export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const p = nextUrl.pathname;

  const isAdminPage = p.startsWith("/admin/");
  const isAdminApi  = p.startsWith("/api/admin/");

  // Non-admin paths: passthrough
  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Admin API: require Bearer (magic link)
  if (isAdminApi) {
    if (hasBearer(req)) return NextResponse.next();
    // API: respond 401 JSON
    return new NextResponse(JSON.stringify({ ok:false, error:"UNAUTHORIZED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Admin pages: no password/cookie gate; render freely
  return NextResponse.next();
}`
  );

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched src/middleware.ts   Backup:", BAK);
}

function patchAdminAuth() {
  const FILE = path.join("src","lib","adminAuth.ts");
  if (!fs.existsSync(FILE)) { console.log("! Skip (adminAuth not found):", FILE); return; }
  const BAK = backup(FILE, "magiclink-only");

  let s = fs.readFileSync(FILE, "utf8");

  // Remove any adminSession imports if present (safe no-op if not there)
  s = s.replace(/import\s+{[^}]*}\s+from\s+["']@\/lib\/adminSession["'];?\s*\n/g, "");

  // Replace requireAdmin with Bearer-only version
  const fnRe = /export\s+async\s+function\s+requireAdmin\s*\([\s\S]*?\)\s*\{[\s\S]*?^\}/m;
  if (fnRe.test(s)) {
    s = s.replace(fnRe, `export async function requireAdmin(req: NextRequest): Promise<{ user: AdminUser } | { error: NextResponse }> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\\s+(.+)$/i);
  if (!m) {
    return { error: NextResponse.json({ ok: false, error: "NO_TOKEN" }, { status: 401 }) };
  }
  const accessToken = m[1];

  const supabase = supabaseServer();

  // Verify token -> user
  const { data: userRes, error: uErr } = await supabase.auth.getUser(accessToken);
  if (uErr || !userRes?.user?.email) {
    return { error: NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401 }) };
  }
  const email = userRes.user.email.toLowerCase();

  // Allow if app_metadata.role === 'admin'
  const role = (userRes.user.app_metadata as any)?.role;
  if (role === "admin") {
    return { user: { id: userRes.user.id, email } };
  }

  // Or if email is on the admins allowlist
  const { data: row, error: aErr } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (aErr || !row) {
    return { error: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { user: { id: userRes.user.id, email } };
}`);
  } else {
    console.log("! Could not locate requireAdmin() to replace in adminAuth.ts");
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched src/lib/adminAuth.ts Backup:", BAK);
}

patchMiddleware();
patchAdminAuth();
