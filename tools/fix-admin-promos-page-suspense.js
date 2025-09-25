const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-suspense";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure "use client"
if (!/^"use client";/m.test(s)) {
  s = `"use client";\n` + s;
}

// 2) Ensure import { Suspense } from "react"
if (!/from\s+["']react["']/.test(s)) {
  s = `import { Suspense } from "react";\n` + s;
} else if (!/Suspense/.test(s)) {
  s = s.replace(/import\s*\{([^}]*)\}\s*from\s*["']react["'];?/, (m, names) => {
    const list = names.split(",").map(x=>x.trim()).filter(Boolean);
    if (!list.includes("Suspense")) list.push("Suspense");
    return `import { ${list.join(", ")} } from "react";`;
  });
}

// 3) Optionally force dynamic to avoid prerender complaints
if (!/export\s+const\s+dynamic\s*=/.test(s)) {
  s = s.replace(/(\nexport default function\s+)/, `\nexport const dynamic = 'force-dynamic';\n$1`);
}

// 4) Wrap the top-level return (...) with <Suspense>...</Suspense>
s = s.replace(/return\s*\(\s*\n/, match => {
  return `return (\n  <Suspense fallback={<div className="rounded-xl border bg-neutral-50 p-4 text-sm">Loading…</div>}>\n`;
});

// close wrapper before the final );
s = s.replace(/\)\s*;\s*$/, `  </Suspense>\n);\n`);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Wrapped /admin/promos page in <Suspense> and set it as client. Backup:", path.basename(bak));
