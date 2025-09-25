const fs = require("fs");
const path = require("path");

function ensureDir(p){ const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function backup(file, tag){
  if (!fs.existsSync(file)) return;
  const bak = file + ".bak-" + tag;
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}
function writeWithBackup(file, content, tag){
  ensureDir(file);
  const bak = backup(file, tag);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", bak ? bak : "(none)");
}

/* 1) Patch DetailsDrawer.tsx to show a tiny "Copied" confirmation */
(function patchDrawer(){
  const file = path.join("src","app","admin","promos","sections","DetailsDrawer.tsx");
  if (!fs.existsSync(file)) {
    console.error("! Not found:", file);
    return;
  }
  let s = fs.readFileSync(file, "utf8");
  let changed = 0;

  // Ensure React import for state
  if (!/import\s+React(\s+as\s+\w+)?\s+from\s+["']react["']/.test(s)) {
    s = s.replace(/^(import[^;]+;[\r\n]+)/, (m)=> m + 'import React from "react";\n');
    changed++;
  }

  // Add justCopied state + feedback span near Copy button.
  if (!s.includes("const [justCopied, setJustCopied]")) {
    // add state after props function line
    s = s.replace(/function DetailsDrawer\([\s\S]*?\)\s*\{\s*if\s*\(!row\)\s*return null;/, (m)=>{
      return m.replace("if (!row) return null;", `const [justCopied, setJustCopied] = React.useState(false);\n  if (!row) return null;`);
    });
    changed++;
  }
  if (!s.includes("function handleCopy(")) {
    // already have a handleCopy in your version; but if not, add simple one
    s = s.replace(/(onCopyCode\?\s*\(row\.code\)\s*;[\s\S]*?}\s*)/, (m)=>m); // noop
  }
  // Enhance handleCopy to set 'justCopied'
  s = s.replace(/function handleCopy\(\)\s*\{[\s\S]*?try\s*\{\s*navigator\.clipboard\.writeText\(row\.code\);\s*\}\s*catch\s*\{\}\s*\}/,
    `function handleCopy(){
    if (onCopyCode) return onCopyCode(row.code);
    try { navigator.clipboard.writeText(row.code); } catch {}
    setJustCopied(true);
    setTimeout(()=>setJustCopied(false), 1200);
  }`);
  // Add feedback span after Copy button (only if missing)
  if (!s.includes("aria-live=\"polite\"") && s.includes("aria-label=\"Copy code\"")) {
    s = s.replace(/(<button[^>]*aria-label="Copy code"[^>]*>Copy<\/button>)/,
      `$1\n            <span className="text-xs text-neutral-500" aria-live="polite">{justCopied ? "Copied" : ""}</span>`);
    changed++;
  }

  if (changed) writeWithBackup(file, s, "step5c-actions-copy");
  else console.log("• DetailsDrawer.tsx already has copy feedback and React import");
})();

/* 2) Ensure page.tsx passes onToggleStatus + onCopyCode into <DetailsDrawer /> */
(function patchPage(){
  const file = path.join("src","app","admin","promos","page.tsx");
  if (!fs.existsSync(file)) { console.warn("! page.tsx not found; skipping"); return; }
  let s = fs.readFileSync(file, "utf8");
  let changed = 0;

  // If <DetailsDrawer .../> is self-closing without props, inject them.
  const selfClosing = /<DetailsDrawer([^>]*)\/>/s;
  if (selfClosing.test(s) && !s.includes("onToggleStatus=")) {
    s = s.replace(selfClosing, (m, attrs) => {
      // Avoid dupe props if onClose already there
      const attrsTrim = attrs.replace(/\s+$/, "");
      return `<DetailsDrawer${attrsTrim} onToggleStatus={onToggleStatus} onCopyCode={(c)=>navigator.clipboard.writeText(c)} />`;
    });
    changed++;
  }

  // If it's an opening tag form, inject props on the opening tag
  const openTag = /<DetailsDrawer([^>]*)>/s;
  if (openTag.test(s) && !s.includes("onToggleStatus=")) {
    s = s.replace(openTag, (m, attrs) => {
      const attrsTrim = attrs.replace(/\s+$/, "");
      return `<DetailsDrawer${attrsTrim} onToggleStatus={onToggleStatus} onCopyCode={(c)=>navigator.clipboard.writeText(c)}>`;
    });
    changed++;
  }

  if (changed) writeWithBackup(file, s, "step5c-actions-copy");
  else console.log("• page.tsx already appears to pass onToggleStatus/onCopyCode or pattern not matched");
})();
