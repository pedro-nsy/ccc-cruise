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

const FILE = path.join("src","app","admin","logout","page.tsx");

const content = `import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/adminSession";

// Server Component: on GET, clear cookie and bounce to password gate
export default async function AdminLogoutPage() {
  clearAdminSession();
  redirect("/admin/password");
}
`;

backupWrite(FILE, content, "8.7-logout");
