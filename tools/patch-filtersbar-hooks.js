const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");

function backup(file, tag){
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function ensureHooks() {
  if (!fs.existsSync(FILE)) { console.log("! FiltersBar not found:", FILE); return; }
  const BAK = backup(FILE, "hooks");
  let s = fs.readFileSync(FILE, "utf8");

  const hasRouter = /const\s+router\s*=\s*useRouter\(/.test(s);
  const hasPathname = /const\s+pathname\s*=\s*usePathname\(/.test(s);
  const hasSP = /const\s+sp\s*=\s*useSearchParams\(/.test(s);

  if (hasRouter && hasPathname && hasSP) {
    console.log("✓ Hooks already present, no changes. Backup:", BAK);
    return;
  }

  // Primary insertion: immediately after the component's opening brace
  const openRe = /(export\s+default\s+function\s+FiltersBar\s*\([^)]*\)\s*\{\s*\n)/;
  if (openRe.test(s)) {
    s = s.replace(openRe, (m) =>
      m +
      `  const router = useRouter();\n` +
      `  const pathname = usePathname();\n` +
      `  const sp = useSearchParams();\n`
    );
  } else {
    // Fallback: insert just before the draft-state comment
    const marker = "// --- draft state";
    if (s.includes(marker)) {
      s = s.replace(marker,
        `const router = useRouter();\nconst pathname = usePathname();\nconst sp = useSearchParams();\n\n${marker}`
      );
    } else {
      // Last resort: inject after the imports line that brings the hooks
      const importRe = /(from\s+"next\/navigation";\s*\n)/;
      s = s.replace(importRe, (m) =>
        m + `\n// Hooks are declared at the top of the component body below.\n`
      );
      // and still try to add at component open
      s = s.replace(openRe, (m) =>
        m +
        `  const router = useRouter();\n` +
        `  const pathname = usePathname();\n` +
        `  const sp = useSearchParams();\n`
      );
    }
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched FiltersBar hooks. Backup:", BAK);
}

ensureHooks();
