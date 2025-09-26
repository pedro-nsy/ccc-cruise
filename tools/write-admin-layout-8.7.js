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

const FILE = path.join("src","app","admin","layout.tsx");

const content = `import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between">
            <div className="text-sm text-neutral-700">Admin</div>
            <Link href="/admin/logout" className="text-sm text-blue-700 hover:underline">Log out</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4">
          {children}
        </div>
      </body>
    </html>
  );
}
`;

backupWrite(FILE, content, "8.7-layout");
