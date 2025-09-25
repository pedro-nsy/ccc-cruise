const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-step1c-syntax";
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
let s = fs.readFileSync(FILE, "utf8");

// 1) Fix the main function signature: ensure total: number; and close types properly
s = s.replace(
/export default function ListTable\(\{\s*items,[\s\S]*?onOpenDetails,\s*[\r\n]+\s*total,\s*\}:\s*\{\s*items:[\s\S]*?onOpenDetails:\s*\(row:\s*any\)=>void;\s*/m,
m => {
  return m.replace(
    /onOpenDetails:\s*\(row:\s*any\)=>void;\s*$/m,
    `onOpenDetails: (row: any)=>void;
  total: number;
`
  );
}
);
s = s.replace(
  /\n\s*\)\s*\{\s*const router/m,
  `\n) {\n  const router`
);

// 2) Fix Th props typing: close the object type before the ")"
s = s.replace(
  /function\s+Th\(\{\s*label,\s*col,\s*className\s*\}\:\s*\{\s*label:\s*string;\s*col:\s*SortKey;\s*className\?:\s*string\s*/m,
  'function Th({ label, col, className }: { label: string; col: SortKey; className?: string })'
);

// 3) Ensure we compute paging vars (page/limit/pages)
if (!/const\s+page\s*=/.test(s)) {
  s = s.replace(
    /const\s+sp\s*=\s*useSearchParams\(\);\s*/,
    `const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.max(1, parseInt(sp.get("limit") ?? "25", 10));
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  `
  );
}

// 4) Remove pagination UI from the loading branch (keep just Loading…)
s = s.replace(
  /(\s*if\s*\(loading\)\s*\{\s*return\s*\(\s*<section[\s\S]*?<div className="text-sm text-neutral-600">Loading…<\/div>)[\s\S]*?<\/section>\s*\)\s*;\s*\}/m,
  `$1
      </section>
    );
  }`
);

// 5) Add setPage helper (if missing)
if (!/function\s+setPage\s*\(/.test(s)) {
  s = s.replace(
    /function\s+setUrl\([\s\S]*?\}\s*\n/m,
    m => m + `
  function setPage(next: number) {
    const url = new URL(window.location.origin + pathname + "?" + sp.toString());
    const n = Math.min(Math.max(1, next), pages);
    url.searchParams.set("page", String(n));
    router.replace(url.toString(), { scroll: false });
  }

`
  );
}

// 6) Inject pagination footer before the final </section> of the main return (if not present)
if (!/Page\s*\{\s*page\s*\}\s*of\s*\{\s*pages\s*\}/.test(s)) {
  s = s.replace(
    /\n\s*<\/section>\s*\n\s*\)\s*;\s*\n\s*\}\s*$/m,
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
console.log("✓ Fixed syntax + added pagination footer in ListTable.tsx. Backup:", path.basename(bak));
