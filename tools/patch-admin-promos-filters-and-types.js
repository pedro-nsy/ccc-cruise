const fs = require("fs");
const path = require("path");

function backup(file, tag){
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}

function patchFiltersBar() {
  const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
  if (!fs.existsSync(FILE)) { console.log("! Skip FiltersBar (not found)"); return; }
  const BAK = backup(FILE, "patch-filters-types");

  let s = fs.readFileSync(FILE, "utf8");

  // If hooks are missing inside the component, inject them at the start of the body.
  const hasRouter = /const\s+router\s*=\s*useRouter\(/.test(s);
  const hasPathname = /const\s+pathname\s*=\s*usePathname\(/.test(s);
  const hasSP = /const\s+sp\s*=\s*useSearchParams\(/.test(s);

  if (!(hasRouter && hasPathname && hasSP)) {
    s = s.replace(
      /export\s+default\s+function\s+FiltersBar\s*\([^)]*\)\s*\{\s*/,
      (m) => m +
        `  const router = useRouter();\n` +
        `  const pathname = usePathname();\n` +
        `  const sp = useSearchParams();\n`
    );
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched FiltersBar.tsx   Backup:", BAK);
}

function patchPageTsx() {
  const FILE = path.join("src","app","admin","promos","page.tsx");
  if (!fs.existsSync(FILE)) { console.log("! Skip page.tsx (not found)"); return; }
  const BAK = backup(FILE, "patch-filters-types");

  let s = fs.readFileSync(FILE, "utf8");

  // 1) Normalize onToggleStatus types: "active" | "archived"
  s = s.replace(
    /const\s+toggleStatus\s*=\s*async\s*\(\s*id:\s*string\|number,\s*to:\s*"active"\s*\|\s*"disabled"\s*\)\s*=>/,
    'const toggleStatus = async (id: string|number, to: "active"|"archived") =>'
  );

  // Also fix any inline mapping that still sends "disabled" for archived
  s = s.replace(/\?\s*"disabled"\s*:\s*"active"/g, '? "archived" : "active"');

  // 2) Remove the duplicate filtersNode prop (keep only the first one)
  // Find all occurrences of: \n<spaces>filtersNode={<FiltersBar ... />}\n
  const regexFiltersNode = /\n\s*filtersNode={<FiltersBar[\s\S]*?\/>}\s*/g;
  const all = [...s.matchAll(regexFiltersNode)];
  if (all.length > 1) {
    // remove all after the first
    let removed = 0;
    s = s.replace(regexFiltersNode, (m) => {
      removed += 1;
      return (removed === 1) ? m : ""; // keep the first, drop the rest
    });
    console.log("✓ Removed duplicate filtersNode prop(s):", all.length - 1);
  }

  fs.writeFileSync(FILE, s, "utf8");
  console.log("✓ Patched page.tsx         Backup:", BAK);
}

patchFiltersBar();
patchPageTsx();
