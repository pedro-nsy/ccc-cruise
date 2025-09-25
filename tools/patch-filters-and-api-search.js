// node tools/patch-filters-and-api-search.js
const fs = require("fs");
const path = require("path");

const WEBROOT = process.cwd();
const filtersPath = path.join(WEBROOT, "src", "app", "admin", "promos", "sections", "FiltersBar.tsx");
const apiPath     = path.join(WEBROOT, "src", "app", "api", "admin", "promos", "route.ts");

function mustRead(p) {
  if (!fs.existsSync(p)) {
    console.error("Not found:", p);
    process.exit(1);
  }
  return fs.readFileSync(p, "utf8");
}

function backupOnce(p, suffix) {
  const bak = p + suffix;
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log("• Backup created:", bak);
  } else {
    console.log("i Backup already exists:", bak);
  }
}

function patchFiltersBar(src) {
  let out = src;
  let changed = false;

  // 1) Add a Clear button right next to the existing Search button.
  //    We wrap the original <button ...>Search</button> inside a small flex row and append a Clear <a>.
  //    We try multiple patterns to catch common JSX whitespace variations.
  const searchBtnRegex = /<button([^>]*)>\s*Search\s*<\/button>/;
  if (searchBtnRegex.test(out) && !/Clear filters|>Clear<\/(a|button)>/.test(out)) {
    out = out.replace(searchBtnRegex, (m, attrs) => {
      const origBtn = `<button${attrs}>Search</button>`;
      const clearBtn = `<a href="/admin/promos?page=1" className="btn btn-ghost text-sm px-3 py-2">Clear</a>`;
      const wrapper  = `<div className="flex items-center justify-end gap-2">${origBtn}${clearBtn}</div>`;
      changed = true;
      return wrapper;
    });
  }

  // 2) (Optional polish) Make the Search button a bit smaller if not already sized
  //    We only add "text-sm px-3 py-2" if those classes aren't there.
  out = out.replace(/<button([^>]*)>\s*Search\s*<\/button>/, (m, attrs) => {
    if (/text-sm|px-3|py-2/.test(attrs)) return m; // already compact
    const newAttrs = attrs.replace(/className="([^"]+)"/, (mm, classes) => {
      return `className="${classes} text-sm px-3 py-2"`;
    });
    if (newAttrs !== attrs) changed = true;
    return `<button${newAttrs}>Search</button>`;
  });

  return { out, changed };
}

function patchApiRoute(src) {
  let out = src;
  let changed = false;

  // Constrain q-search to "code" or "assigned_to_name" only.
  // Replace any existing query = query.or([...]); block with just these two fields.
  const orBlockRegex = /query\s*=\s*query\.or\(\s*(\[[\s\S]*?\]\.join\(",\"\)|".*")\s*\);/m;
  if (orBlockRegex.test(out)) {
    const newBlock =
`query = query.or(
  [
    "code.ilike." + q,
    "assigned_to_name.ilike." + q
  ].join(",")
);`;
    out = out.replace(orBlockRegex, newBlock);
    changed = true;
  } else if (/code\.ilike\./.test(out) || /assigned_.*\.ilike\./.test(out)) {
    // Fallback: brute-force clean up other ilike fields if present
    out = out
      .replace(/assigned_name\.ilike\.[^",)]+,?/g, "")
      .replace(/assigned_email\.ilike\.[^",)]+,?/g, "")
      .replace(/assigned_phone\.ilike\.[^",)]+,?/g, "")
      .replace(/note\.ilike\.[^",)]+,?/g, "");
    if (!/assigned_to_name\.ilike\./.test(out)) {
      // Ensure we include assigned_to_name
      out = out.replace(/code\.ilike\.[^",)]+/, (m) => `${m},"assigned_to_name.ilike." + q`);
    }
    changed = true;
  } else {
    // If no .or(...) was found, try to inject a minimal or() clause right after qRaw is computed.
    const anchor = /if\s*\(\s*qRaw\s*\)\s*\{\s*[^}]*\}/m;
    if (anchor.test(out)) {
      out = out.replace(anchor, (block) => {
        // Replace entire qRaw block with our standard pattern
        return `if (qRaw) {
    const q = "%" + qRaw + "%";
    query = query.or(
      [
        "code.ilike." + q,
        "assigned_to_name.ilike." + q
      ].join(",")
    );
  }`;
      });
      changed = true;
    }
  }

  return { out, changed };
}

// --- run ---
const filtersSrc = mustRead(filtersPath);
backupOnce(filtersPath, ".bak-step1a-side-by-side");
const patchedFilters = patchFiltersBar(filtersSrc);
if (patchedFilters.changed) {
  fs.writeFileSync(filtersPath, patchedFilters.out, "utf8");
  console.log("✓ FiltersBar.tsx patched: added side-by-side Clear next to Search.");
} else {
  console.log("i FiltersBar.tsx: no change applied (pattern not found or Clear already present).");
}

const apiSrc = mustRead(apiPath);
backupOnce(apiPath, ".bak-search-scope");
const patchedApi = patchApiRoute(apiSrc);
if (patchedApi.changed) {
  fs.writeFileSync(apiPath, patchedApi.out, "utf8");
  console.log("✓ GET route patched: q-search now matches 'code' OR 'assigned_to_name' (partial, case-insensitive).");
} else {
  console.log("i GET route: no change applied (existing logic already matches or pattern not found).");
}

console.log("Done.");
