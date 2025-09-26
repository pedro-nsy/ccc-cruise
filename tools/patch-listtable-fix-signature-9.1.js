const fs = require("fs"), path = require("path");

const FILE = path.join("src","app","admin","promos","sections","ListTable.tsx");
if (!fs.existsSync(FILE)) { console.error("Not found:", FILE); process.exit(1); }
const BAK = FILE + ".bak-9.1-fix-sig";
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let s = fs.readFileSync(FILE, "utf8");

// Replace the whole function header (params + types) with a clean version
s = s.replace(
  /export default function ListTable\(\{[\s\S]*?\}\s*:\s*\{[\s\S]*?\}\s*\)\s*\{/m,
  `export default function ListTable({
  items,
  loading,
  onCopy,
  onToggleStatus,
  onOpenDetails,
  total,
  filtersNode,
}: {
  items: Array<{
    id: string | number;
    code: string;
    type: "early_bird" | "artist" | "staff";
    status: "active" | "archived" | "reserved" | "consumed";
    used_count: number;
    assigned_to_name: string | null;
    created_at?: string;
  }>;
  loading: boolean;
  onCopy: (code: string) => void;
  onToggleStatus: (id: string | number, to: "active" | "archived") => void;
  onOpenDetails: (row: any) => void;
  total: number;
  filtersNode?: React.ReactNode;
}) {`
);

fs.writeFileSync(FILE, s, "utf8");
console.log("✓ Fixed ListTable signature. Backup:", BAK);
