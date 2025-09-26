const fs = require("fs"), path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-draft-fix";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// 1) Ensure "use client" is FIRST line (strip any BOM before it and move to top)
s = s.replace(/^\uFEFF?/, "");                   // remove BOM if present
s = s.replace(/^\s*"use client";\s*/m, "");      // remove misplaced directive
s = `"use client";\n` + s;                       // add at very top

// 2) Ensure react imports include useState and useEffect
if (!/from\s+["']react["']/.test(s)) {
  s = `import { useEffect, useState } from "react";\n` + s;
} else {
  s = s.replace(/import\s+\{\s*([^}]*)\}\s+from\s+["']react["'];?/, (m, names) => {
    const needed = ["useState","useEffect"].filter(n => !new RegExp("\\b"+n+"\\b").test(names));
    return needed.length ? `import { ${names.replace(/\s+$/,"")}${names.trim()?", ":""}${needed.join(", ")} } from "react";` : m;
  });
}

// 3) Insert qDraft state + sync (right after function start)
s = s.replace(
  /(export default function FiltersBar\([^)]*\)\s*\{\s*)/,
  `$1\n  // local draft for search input (apply on Search/Enter)\n  const [qDraft, setQDraft] = useState(q);\n  useEffect(() => { setQDraft(q); }, [q]);\n`
);

// 4) Wire input to draft + apply on Enter
s = s.replace(/value=\{q\}/, "value={qDraft}");
s = s.replace(/onChange=\{[^}]*\}/, 'onChange={e => setQDraft(e.target.value)}');
s = s.replace(/onKeyDown=\{[^}]*\}/, 'onKeyDown={e => { if (e.key === "Enter") { setQ(qDraft); onSearch(); } }}');

// 5) Ensure Search button applies draft then searches
s = s.replace(/onClick=\{\s*onSearch\s*\}/g, 'onClick={() => { setQ(qDraft); onSearch(); }}')
     .replace(/onClick=\{\s*\(\)\s*=>\s*onSearch\(\)\s*\}/g, 'onClick={() => { setQ(qDraft); onSearch(); }}');

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ FiltersBar draft search fixed. Backup:", BAK);
