export function TypeChip({ t }: { t: "early_bird"|"artist"|"staff" }) {
  const label = t === "early_bird" ? "Early Bird (15%)" : t === "artist" ? "Artist (50%)" : "Staff";
  const color =
    t === "early_bird" ? "border-blue-300 text-blue-700 bg-blue-50" :
    t === "artist"     ? "border-purple-300 text-purple-700 bg-purple-50" :
                         "border-green-200 text-green-700 bg-green-50";
  return <span className={`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs ${color}`}>{label}</span>;
}

export function StatusChip({ s }: { s: "active"|"disabled" }) {
  const label = s === "active" ? "active" : "disabled";
  const color = s === "active" ? "border-neutral-300 text-neutral-700 bg-neutral-50" : "border-amber-300 text-amber-800 bg-amber-50";
  return <span className={`inline-flex items-center rounded-xl px-2.5 py-1 border text-xs ${color}`}>{label}</span>;
}
