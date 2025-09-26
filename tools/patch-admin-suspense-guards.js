const fs = require("fs");
const path = require("path");

function backup(file, tag){
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function patchLoginPage() {
  const FILE = path.join("src","app","admin","login","page.tsx");
  if (!fs.existsSync(FILE)) { console.log("! Skip login page (not found)"); return; }
  const BAK = backup(FILE, "suspense");

  let s = fs.readFileSync(FILE, "utf8");

  // Ensure "use client" at top
  if (!/^"use client";/.test(s)) s = `"use client";\n` + s;

  // Ensure Suspense import
  if (!/from\s+"react";?\s*$|from\s+'react';?\s*$/m.test(s)) {
    // already importing from react earlier; add Suspense safely
  }
  if (!/Suspense\b/.test(s)) {
    s = s.replace(/from\s+"react"\);?/, 'from "react";\nimport { Suspense } from "react"');
    if (!/Suspense\b/.test(s)) {
      // fallback: add a dedicated import line
      s = s.replace(/("use client";\s*)/, `$1import { Suspense } from "react";\n`);
    }
  } else {
    // Ensure Suspense is imported explicitly
    s = s.replace(/import\s*{([^}]*)}\s*from\s*"react";?/, (m, g1) => {
      const names = g1.split(",").map(x=>x.trim()).filter(Boolean);
      if (!names.includes("Suspense")) names.push("Suspense");
      return `import { ${names.join(", ")} } from "react";`;
    });
  }

  // If the file already has a single default export component, wrap it by splitting into wrapper + inner.
  if (!/function\s+LoginInner\s*\(/.test(s)) {
    // Rename default component to LoginInner and create a new default that renders Suspense + LoginInner
    s = s.replace(/export\s+default\s+function\s+AdminLoginPage\s*\(/, 'function LoginInner(');
    // If default export is an arrow or const, try a second pattern (not used in provided code, but safe)
    s = s.replace(/export\s+default\s+const\s+AdminLoginPage\s*=\s*\(/, 'const LoginInner = (');

    // Append the wrapper default export
    s += `

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
`;
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched admin login page   Backup:", BAK);
}

function patchAdminLayout() {
  const FILE = path.join("src","app","admin","layout.tsx");
  if (!fs.existsSync(FILE)) { console.log("! Skip admin layout (not found)"); return; }
  const BAK = backup(FILE, "suspense");

  let s = fs.readFileSync(FILE, "utf8");

  // Ensure "use client"
  if (!/^"use client";/.test(s)) s = `"use client";\n` + s;

  // Ensure Suspense import
  if (!/import\s*{[^}]*Suspense[^}]*}\s*from\s*"react";?/.test(s)) {
    if (/import\s*{[^}]*}\s*from\s*"react";?/.test(s)) {
      s = s.replace(/import\s*{([^}]*)}\s*from\s*"react";?/, (m, g1) => {
        const names = g1.split(",").map(x=>x.trim()).filter(Boolean);
        if (!names.includes("Suspense")) names.push("Suspense");
        return `import { ${names.join(", ")} } from "react";`;
      });
    } else {
      s = s.replace(/("use client";\s*)/, `$1import { Suspense } from "react";\n`);
    }
  }

  // Rename default AdminLayout to AdminLayoutWrapper and create inner gate that uses useSearchParams
  if (!/function\s+AdminGate\s*\(/.test(s)) {
    // Rename default export to AdminGate
    s = s.replace(/export\s+default\s+function\s+AdminLayout\s*\(\s*{[^}]*}\s*:\s*{[^}]*}\s*\)\s*\{/, 'function AdminGate({ children }: { children: React.ReactNode }) {');
    s = s.replace(/export\s+default\s+function\s+AdminLayout\s*\(\s*{[^}]*}\s*\)\s*\{/, 'function AdminGate({ children }: { children: React.ReactNode }) {');
    s = s.replace(/export\s+default\s+function\s+AdminLayout\s*\(/, 'function AdminGate(');
    s = s.replace(/export\s+default\s+const\s+AdminLayout\s*=\s*/, 'const AdminGate = ');

    // Append new default wrapper that provides Suspense
    s += `

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
`;
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched admin layout       Backup:", BAK);
}

patchLoginPage();
patchAdminLayout();
