const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","page.tsx");
if (!fs.existsSync(FILE)) {
  console.error("Not found:", FILE);
  process.exit(1);
}
let s = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".bak-step5c-props";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let changed = 0;

// Ensure we pass BOTH props to DetailsDrawer (self-closing usage)
s = s.replace(
  /<DetailsDrawer([\s\S]*?)onClose=\{closeDetails\}([\s\S]*?)\/>/m,
  (m, a1, a2) => {
    if (m.includes("onToggleStatus=") && m.includes("onCopyCode=")) return m; // already wired
    changed++;
    const inject =
      ` onToggleStatus={(id,to)=>toggleStatus(id, to==="archived" ? "disabled" : "active")}` +
      ` onCopyCode={copyCode}`;
    return `<DetailsDrawer${a1}onClose={closeDetails}${inject}${a2} />`;
  }
);

// Fallback: inject props on any opening tag if the exact pattern above didn't match
if (changed === 0 && /<DetailsDrawer[^>]*>/.test(s)) {
  s = s.replace(/<DetailsDrawer([^>]*)>/m, (m, attrs) => {
    if (m.includes("onToggleStatus=") && m.includes("onCopyCode=")) return m;
    changed++;
    return `<DetailsDrawer${attrs} onToggleStatus={(id,to)=>toggleStatus(id, to==="archived" ? "disabled" : "active")} onCopyCode={copyCode}>`;
  });
}

if (changed > 0) {
  fs.writeFileSync(FILE, s, "utf8");
  console.log(`✓ Patched ${FILE}. Injected props. Backup: ${bak}`);
} else {
  console.log("• No changes applied (props already present or pattern not matched).");
}
