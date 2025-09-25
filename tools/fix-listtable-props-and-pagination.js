const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1c-fix";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, "utf8");

// 1) Fix props type header: add total: number; and close the object with }
s = s.replace(
  /export default function ListTable\(\{\s*([\s\S]*?)\}\s*:\s*\{\s*([\s\S]*?)\}\s*\)\s*\{/m,
  (m, params, props) => {
    let p = params;
    if (!/[\s,]total\s*,?/.test(p)) p = p.replace(/\s*\}\s*$/, ", total, }");
    let t = props;
    if (!/total\s*:\s*number/.test(t)) t = t.replace(/\}\s*$/, ",\n  total: number\n}");
    return `export default function ListTable({ ${p} }: { ${t} ) {`;
  }
);

// 2) Remove pagination block from the Loading branch (keep just the Loading… div)
s = s.replace(
  /(<section[\s\S]*?Loading…<\/div>)[\s\S]*?<\/section>\s*\)\s*;\s*\}/m,
  `$1
    </section>

    );
  }`
);

// 3) Ensure setPage(next) helper exists
if (!/function\s+setPage\s*\(/.test(s)) {
  s = s.replace(
    /function\s+setUrl[\s\S]*?\}\n\s*\n/m,
    (m) => m + 
`  function setPage(next) {
    const url = new URL(window.location.origin + pathname + "?" + sp.toString());
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(sp.get("limit") ?? "25", 10));
    const pages = Math.max(1, Math.ceil((total || 0) / limit));
    const n = Math.min(Math.max(1, next), pages);
    url.searchParams.set("page", String(n));
    router.replace(url.toString(), { scroll: false });
  }

`
  );
}

// 4) Inject pagination at end of MAIN return (before final </section>) if missing
if (!/Page\s*\{\s*page\s*\}\s*of\s*\{\s*pages\s*\}/.test(s)) {
  s = s.replace(
    /\n\s*<\/section>\s*\n\s*\)\s*;\s*\n\s*\}$/m,
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
  );
}
`
  );
}

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Fixed ListTable props type and pagination placement. Backup:", path.basename(bak));
