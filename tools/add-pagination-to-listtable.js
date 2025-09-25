const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1c";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");
let changed = false;

// 1) Ensure next/navigation hooks imported (we used them earlier for sorting)
if (!/useSearchParams/.test(s) || !/usePathname/.test(s) || !/useRouter/.test(s)) {
  s = s.replace(
    /from\s+"next\/navigation";/,
    (m) => m.replace('{', '{ usePathname, useRouter, useSearchParams, ')
  );
  changed = true;
}

// 2) Add total to props if missing
if (!/total:\s*number/.test(s)) {
  s = s.replace(
    /export default function ListTable\(\{\s*([\s\S]*?)\}\:\s*\{\s*([\s\S]*?)\}\)\s*\{/m,
    (m, params, props) => {
      const withParam = params.trim().endsWith(",") ? params + " total," : params + ", total";
      const withProp  = props.includes("total: number") ? props : props.replace(/\}\s*$/, ",\n  total: number\n}");
      changed = true;
      return `export default function ListTable({ ${withParam} }: { ${withProp} ) {`;
    }
  );
}

// 3) Compute page/limit/pages in component scope
if (!/const\s+page\s*=/.test(s) || !/const\s+limit\s*=/.test(s)) {
  s = s.replace(
    /const\s+sp\s*=\s*useSearchParams\(\);\s*/m,
    `const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.max(1, parseInt(sp.get("limit") ?? "25", 10));
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  `
  );
  changed = true;
}

// 4) Add a helper to set page in URL and keep others; prevent scroll jump
if (!/function\s+setPage\(/.test(s)) {
  s = s.replace(
    /function\s+setUrl\([\s\S]*?\}\n\s*\}\n\s*/m,
    (m) => m + `
  function setPage(next) {
    const url = new URL(window.location.origin + pathname + "?" + sp.toString());
    const n = Math.min(Math.max(1, next), pages);
    url.searchParams.set("page", String(n));
    router.replace(url.toString(), { scroll: false });
  }
`
  );
  changed = true;
}

// 5) Inject a paging footer before the closing </section>
if (!/Page\s+\{page\}\s+of\s+\{pages\}/.test(s)) {
  s = s.replace(
    /<\/section>\s*$/m,
    `
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-neutral-600">Page {page} of {pages}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost text-sm px-3 py-1.5"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm px-3 py-1.5"
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
`
  );
  changed = true;
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Pagination UI added to ListTable.tsx. Backup:", path.basename(bak));
