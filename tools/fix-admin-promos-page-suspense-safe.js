const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-suspense-safe";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");

// 0) Normalize line endings (avoid regex surprises)
s = s.replace(/\r\n/g, "\n");

// 1) Ensure "use client" at the very top (once)
if (!/^"use client";/m.test(s)) {
  s = `"use client";\n` + s.replace(/^"use client";\n/g, "");
}

// 2) Ensure import { Suspense } from "react"
if (!/from\s+["']react["']/.test(s)) {
  s = `import { Suspense } from "react";\n` + s;
} else if (!/\bSuspense\b/.test(s)) {
  s = s.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']react["'];?/,
    (m, names) => {
      const list = names.split(",").map(x=>x.trim()).filter(Boolean);
      if (!list.includes("Suspense")) list.push("Suspense");
      return `import { ${list.join(", ")} } from "react";`;
    }
  );
}

// 3) Ensure dynamic = 'force-dynamic'
if (!/export\s+const\s+dynamic\s*=/.test(s)) {
  // Insert before export default function (or at top if not found)
  if (/export\s+default\s+function\s+/m.test(s)) {
    s = s.replace(/export\s+default\s+function\s+/, `export const dynamic = 'force-dynamic';\n\nexport default function `);
  } else {
    s = `export const dynamic = 'force-dynamic';\n` + s;
  }
}

// 4) Remove any previously inserted Suspense at the very top-level return (if we added one)
s = s.replace(
  /return\s*\(\s*<Suspense[\s\S]*?fallback=\{[\s\S]*?\}\s*>\s*/m,
  "return (\n"
);
s = s.replace(
  /\s*<\/Suspense>\s*\)\s*;\s*$/m,
  "\n);\n"
);

// 5) Wrap the top-level return body with a single Suspense
// Find the *first* "return (" and the *last* ");"
const returnStart = s.indexOf("return (");
const returnEnd   = s.lastIndexOf(");\n");
if (returnStart !== -1 && returnEnd !== -1 && returnEnd > returnStart) {
  const before = s.slice(0, returnStart + "return (".length);
  const inner  = s.slice(returnStart + "return (".length, returnEnd);
  const after  = s.slice(returnEnd);

  const fallback = `<div className="rounded-xl border bg-neutral-50 p-4 text-sm">Loading…</div>`;
  s = `${before}
  <Suspense fallback={${fallback}}>
${inner.trimStart()}
  </Suspense>
${after}`;
}

// 6) Final cleanup of duplicate semicolons/extra closers that may be lingering
s = s.replace(/\n{3,}/g, "\n\n");       // collapse too many blank lines
s = s.replace(/\)\s*;\s*\)\s*;/g, ");"); // remove accidental double closers

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ /admin/promos wrapped in a single <Suspense> safely. Backup:", path.basename(bak));
