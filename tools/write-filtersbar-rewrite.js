const fs = require("fs");
const path = require("path");

const FILE = path.join("src","app","admin","promos","sections","FiltersBar.tsx");
const BAK  = FILE + ".bak-rewrite";

function backupWrite(file, content, tagFile){
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(file) && !fs.existsSync(tagFile)) fs.copyFileSync(file, tagFile);
  fs.writeFileSync(file, content, "utf8");
}

const content = `\"use client\";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  q: string;
  type: "" | "early_bird" | "artist" | "staff";
  status: "" | "active" | "archived" | "reserved" | "consumed";
  used: "" | "yes" | "no";
  setQ: (v: string)=>void;
  setType: (v: "" | "early_bird" | "artist" | "staff")=>void;
  setStatus: (v: "" | "active" | "archived" | "reserved" | "consumed")=>void;
  setUsed: (v: "" | "yes" | "no")=>void;
  onSearch: () => void;         // accepted for compatibility; not used
  embedded?: boolean;           // accepted for compatibility; not used
};

export default function FiltersBar(props: Props) {
  const { q, type, status, used } = props; // we rely on URL as source of truth; setters not needed here

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // --- draft state: nothing applies until Search/Enter ---
  const [qDraft, setQDraft] = useState(q);
  const [typeDraft, setTypeDraft] = useState(type);
  const [statusDraft, setStatusDraft] = useState(status);
  const [usedDraft, setUsedDraft] = useState(used);

  // Keep drafts in sync when URL/props change (back/forward, Clear, links)
  useEffect(() => { setQDraft(q); }, [q]);
  useEffect(() => { setTypeDraft(type); }, [type]);
  useEffect(() => { setStatusDraft(status); }, [status]);
  useEffect(() => { setUsedDraft(used); }, [used]);

  function buildUrlFromDrafts() {
    const url = new URL(window.location.origin + pathname + "?" + sp.toString());
    const setParam = (k: string, v: string) => {
      if (v && v !== "all" && v !== "") url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    };
    setParam("q", (qDraft || "").trim());
    setParam("type", typeDraft || "");
    setParam("status", statusDraft || "");
    setParam("used", usedDraft || "");
    url.searchParams.set("page", "1");
    return url;
  }

  function apply() {
    const url = buildUrlFromDrafts();
    router.replace(url.toString(), { scroll: false });
  }

  function clearAll(e?: any) {
    if (e) e.preventDefault();
    setQDraft(""); setTypeDraft(""); setStatusDraft(""); setUsedDraft("");
    const url = new URL(window.location.origin + pathname);
    url.searchParams.set("page", "1");
    router.replace(url.toString(), { scroll: false });
  }

  return (
    <div className="sticky top-20 z-10">
      <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="rounded-xl border border-neutral-300 px-2.5 py-1.5 text-sm"
            placeholder="Search code or name…"
            value={qDraft}
            onChange={e => setQDraft(e.target.value)}
            onKeyDown={e => { if ((e as any).key === "Enter") apply(); }}
          />
          <select
            className="rounded-xl border border-neutral-300 px-2.5 py-1.5 text-sm"
            value={typeDraft}
            onChange={e => setTypeDraft((e.target as HTMLSelectElement).value as Props["type"])}
          >
            <option value="">All types</option>
            <option value="early_bird">Early Bird</option>
            <option value="artist">Artist</option>
            <option value="staff">Staff</option>
          </select>
          <select
            className="rounded-xl border border-neutral-300 px-2.5 py-1.5 text-sm"
            value={statusDraft}
            onChange={e => setStatusDraft((e.target as HTMLSelectElement).value as Props["status"])}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="reserved">Reserved</option>
            <option value="consumed">Consumed</option>
          </select>
          <select
            className="rounded-xl border border-neutral-300 px-2.5 py-1.5 text-sm"
            value={usedDraft}
            onChange={e => setUsedDraft((e.target as HTMLSelectElement).value as Props["used"])}
          >
            <option value="">Used (all)</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn btn-primary text-sm px-2.5 py-1.5" onClick={apply}>Search</button>
            <a href="/admin/promos?page=1" className="btn btn-ghost text-sm px-2.5 py-1.5" onClick={clearAll}>Clear</a>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

backupWrite(FILE, content, BAK);
console.log("✓ Wrote", FILE, "Backup:", fs.existsSync(BAK) ? BAK : "(none)");
