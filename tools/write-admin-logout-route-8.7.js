const fs = require("fs");
const path = require("path");

function backupWrite(file, content, tag){
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
}

const logoutDir  = path.join("src","app","admin","logout");
const pageFile   = path.join(logoutDir, "page.tsx");
const routeFile  = path.join(logoutDir, "route.ts");

// 1) Backup and remove page.tsx if present (so the route handler is used)
if (fs.existsSync(pageFile)) {
  const bak = pageFile + ".bak-replaced-8.7";
  if (!fs.existsSync(bak)) fs.copyFileSync(pageFile, bak);
  fs.unlinkSync(pageFile);
  console.log("→ Removed page.tsx (backed up to", bak + ")");
}

// 2) Write route.ts that clears the cookie and redirects
const content = `import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminSession";

export async function GET(req: NextRequest) {
  // Build redirect to the password gate
  const url = new URL("/admin/password", req.nextUrl.origin);
  const res = NextResponse.redirect(url, { status: 307 });
  // Clear the admin session cookie
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
`;

backupWrite(routeFile, content, "8.7-logout-route");
