const fs = require("fs"), path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-search-draft";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure "use client" is present at very top
if (!/^\s*"use client";/.test(s)) {
  s = `"use client";\n` + s;
}

// 2) Ensure useState/useEffect are imported
if (!/from\s+["']react["']/.test(s)) {
  s = `import { useEffect, useState } from "react";\n` + s;
} else {
  // add named imports if line exists but not the names
  s = s.replace(/import\s+\{\s*([^}]*)\}\s+from\s+["']react["'];?/, (m, names) => {
    const want = ["useState","useEffect"].filter(n => !new RegExp("\\b"+n+"\\b").test(names));
    return want.length ? `import { ${names.replace(/\s+$/,"")}${names.trim()?", ":""}${want.join(", ")} } from "react";` : m;
  });
}

// 3) Insert qDraft state + sync (after function signature)
s = s.replace(
  /(export default function FiltersBar\([^)]*\)\s*\{\s*)/,
  `$1\n  // local draft for search input (apply on Search/Enter)\n  const [qDraft, setQDraft] = useState(q);\n  useEffect(() => { setQDraft(q); }, [q]);\n`
);

// 4) Input: value={q} -> value={qDraft}
s = s.replace(/value=\{q\}/, "value={qDraft}");

// 5) Input: onChange set local draft only
s = s.replace(/onChange=\{\s*e\s*=>\s*setQ\(e\.target\.value\)\s*\}/, 'onChange={e => setQDraft(e.target.value)}');

// 6) Enter key: apply draft then search
s = s.replace(
  /onKeyDown=\{\s*e\s*=>\s*\{\s*if\s*\(\s*e\.key\s*===\s*["']Enter["']\s*\)\s*onSearch\(\);\s*\}\s*\}/,
  'onKeyDown={e => { if (e.key === "Enter") { setQ(qDraft); onSearch(); } }}'
);

// 7) Search button: apply draft then search (covers onClick={onSearch} or () => onSearch() variants)
s = s.replace(/onClick=\{\s*onSearch\s*\}/g, 'onClick={() => { setQ(qDraft); onSearch(); }}')
     .replace(/onClick=\{\s*\(\)\s*=>\s*onSearch\(\)\s*\}/g, 'onClick={() => { setQ(qDraft); onSearch(); }}');

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar: switched search to draft/apply. Backup:", BAK);
