const fs = require("fs");
const path = require("path");

const file = path.join("src","app","admin","promos","sections","StatsStrip.tsx");
if (!fs.existsSync(file)) {
  console.error("Not found:", file);
  process.exit(1);
}
const bak = file + ".bak-fix";
if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);

const next = `import React from "react";

type StatObj = { early_bird: number; artist: number; staff: number };
type CapsObj = { early_bird: number | null; artist: number | null; staff: number | null };

export default function StatsStrip({ stats }: { stats: any | null }) {
  if (!stats) {
    return <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">Loading…</div>;
  }

  const created: StatObj = {
    early_bird: Number(stats?.created?.early_bird) || 0,
    artist:     Number(stats?.created?.artist)     || 0,
    staff:      Number(stats?.created?.staff)      || 0,
  };

  const consumed: StatObj = {
    early_bird: Number(stats?.consumed?.early_bird) || 0,
    artist:     Number(stats?.consumed?.artist)     || 0,
    staff:      Number(stats?.consumed?.staff)      || 0,
  };

  // in_cap = active + reserved + consumed (everything that still occupies a slot)
  const inCap: StatObj = {
    early_bird: Number(stats?.in_cap?.early_bird) || 0,
    artist:     Number(stats?.in_cap?.artist)     || 0,
    staff:      Number(stats?.in_cap?.staff)      || 0,
  };

  const caps: CapsObj = {
    early_bird: stats?.caps?.early_bird ?? null,
    artist:     stats?.caps?.artist     ?? null,
    staff:      stats?.caps?.staff      ?? null,
  };

  const remEB      = typeof caps.early_bird === "number" ? Math.max(0, caps.early_bird - inCap.early_bird) : null;
  const remArtist  = typeof caps.artist     === "number" ? Math.max(0, caps.artist     - inCap.artist)     : null;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Block
          title="Early Bird codes:"
          lines={[
            <span key="c">{created.early_bird} / {caps.early_bird ?? "—"} created</span>,
            <span key="u">{consumed.early_bird} / {created.early_bird} used</span>,
            <span key="r" className="text-xs text-neutral-600">Remaining: {remEB ?? "—"}</span>,
          ]}
        />
        <Block
          title="Artist codes:"
          lines={[
            <span key="c">{created.artist} / {caps.artist ?? "—"} created</span>,
            <span key="u">{consumed.artist} / {created.artist} used</span>,
            <span key="r" className="text-xs text-neutral-600">Remaining: {remArtist ?? "—"}</span>,
          ]}
        />
        <Block
          title="Staff codes:"
          lines={[
            <span key="c">{created.staff} created</span>,
            <span key="u">{consumed.staff} / {created.staff} used</span>,
            <span key="r" className="text-xs text-neutral-600">No cap</span>,
          ]}
        />
      </div>
    </div>
  );
}

function Block({ title, lines }: { title: string; lines: React.ReactNode[] }) {
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center space-y-1">
      <strong>{title}</strong>
      {lines.map((ln, i) => <div key={i}>{ln}</div>)}
    </div>
  );
}
`;

fs.writeFileSync(file, next, "utf8");
console.log("✓ Rewrote StatsStrip.tsx (backup:", path.basename(bak), ")");
