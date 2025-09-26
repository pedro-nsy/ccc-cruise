const fs = require("fs"), path = require("path");
const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-add-qdraft";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);
let s = fs.readFileSync(FILE, "utf8");

// Ensure "use client" stays first line (harmless if already correct)
s = s.replace(/^\uFEFF?/, "");
s = s.replace(/^\s*"use client";\s*/m, "");
s = `"use client";\n` + s;

// Ensure react import contains useState/useEffect
if (!/from\s+["']react["']/.test(s)) {
  s = `import { useEffect, useState } from "react";\n` + s;
} else {
  s = s.replace(/import\s+\{\s*([^}]*)\}\s+from\s+["']react["'];?/, (m, names) => {
    const need = ["useState","useEffect"].filter(n => !new RegExp("\\b"+n+"\\b").test(names));
    return need.length ? `import { ${names.trim()}${names.trim()?", ":""}${need.join(", ")} } from "react";` : m;
  });
}

// Insert qDraft state + sync immediately after the function opening brace
if (!/const\s*\[\s*qDraft\s*,\s*setQDraft\s*\]/.test(s)) {
  s = s.replace(
    /(export default function FiltersBar\([^)]*\)\s*\{\s*)/,
    `$1
  // local draft for the search box; apply on Search/Enter
  const [qDraft, setQDraft] = useState(q);
  useEffect(() => { setQDraft(q); }, [q]);
`
  );
}

// Make Clear also reset qDraft (only if that handler exists)
s = s.replace(
  /setQ\(""\);\s*setType\(""\);\s*setStatus\(""\);\s*setUsed\(""\);/,
  'setQ(""); setType(""); setStatus(""); setUsed(""); setQDraft("");'
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar: added qDraft + sync; Clear resets draft. Backup:", BAK);
