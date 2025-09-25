const fs = require("fs");
const path = require("path");
const FILE = path.join("src","app","api","admin","promos","route.ts");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const bak = FILE + ".bak-derived-status";
const src0 = fs.readFileSync(FILE, "utf8");
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);

// Anchor after list fetch
const anchor = "if (listErr) return NextResponse.json({ ok: false, error: \"QUERY_FAILED\", detail: listErr.message }, { status: 500 });";

if (!src0.includes(anchor)) {
  console.error("Anchor not found; route changed. Paste file and I’ll tailor the patch.");
  process.exit(1);
}

let s = src0;

const inject = `
    // Derive effective status for items in this page from promo_usages (reserved/consumed)
    const ids = (items || []).map((it:any) => it.id).filter(Boolean);
    let derived: Record<string, "reserved"|"consumed"> = {};
    if (ids.length) {
      const { data: uses, error: usesErr } = await supabase
        .from("promo_usages")
        .select("promo_code_id,status")
        .in("promo_code_id", ids as any)
        .in("status", ["reserved","consumed"]);
      if (!usesErr && Array.isArray(uses)) {
        for (const u of uses as any[]) {
          const k = String(u.promo_code_id);
          // consumed wins over reserved
          if (u.status === "consumed") { derived[k] = "consumed"; continue; }
          if (!derived[k]) derived[k] = "reserved";
        }
      }
    }
    const itemsOut = (items || []).map((it:any) => {
      const k = String(it.id);
      let nextStatus = it.status;
      if (it.status !== "archived") {
        if (derived[k] === "consumed") nextStatus = "consumed";
        else if (derived[k] === "reserved") nextStatus = "reserved";
      }
      return { ...it, status: nextStatus };
    });
`;

s = s.replace(
  anchor,
  anchor + inject
);

// Replace response items: itemsOut instead of items
s = s.replace(
  "items: items || [],",
  "items: itemsOut || [],"
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Patched admin GET to derive reserved/consumed for display. Backup:", bak);
