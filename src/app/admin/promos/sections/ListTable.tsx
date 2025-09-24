import { Info } from "lucide-react";
import { TypeChip, StatusChip } from "./chips";
import { yesNo } from "./format";

export default function ListTable({
  items,
  loading,
  onCopy,
  onToggleStatus,
  onOpenDetails,
}: {
  items: Array<{ id: string|number; code: string; type: "early_bird"|"artist"|"staff"; status: "active"|"disabled"; used_count: number; assigned_to_name: string|null; }>;
  loading: boolean;
  onCopy: (code: string)=>void;
  onToggleStatus: (id: string|number, to: "active"|"disabled")=>void;
  onOpenDetails: (row: any)=>void;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-neutral-600">Loading…</div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
          No codes match your filters. Try adjusting search or filters.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="space-y-3">
        <div className="grid grid-cols-12 text-sm font-medium text-neutral-600">
          <div className="col-span-3">Code</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Used</div>
          <div className="col-span-2">Assigned to</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {items.map((p) => (
          <div key={String(p.id)} className="grid grid-cols-12 items-center text-sm py-2 border-t">
            {/* Code + Copy */}
            <div className="col-span-3 font-mono font-semibold flex items-center gap-2">
              {p.code}
              <button
                className="px-2 py-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded"
                title="Copy code"
                onClick={() => onCopy(p.code)}
              >
                Copy
              </button>
            </div>

            {/* Type */}
            <div className="col-span-2"><TypeChip t={p.type} /></div>

            {/* Status */}
            <div className="col-span-2"><StatusChip s={p.status} /></div>

            {/* Used (Yes/No) */}
            <div className="col-span-1">{yesNo(p.used_count)}</div>

            {/* Assigned to (name only) */}
            <div className="col-span-2 truncate">{p.assigned_to_name || "—"}</div>

            {/* Actions */}
            <div className="col-span-2 text-right flex items-center justify-end gap-2">
              {p.status === "active" ? (
                <button className="btn btn-ghost" onClick={() => onToggleStatus(p.id, "disabled")}>Disable</button>
              ) : (
                <button className="btn btn-primary" onClick={() => onToggleStatus(p.id, "active")}>Enable</button>
              )}
              <button className="btn btn-ghost inline-flex items-center gap-1" onClick={() => onOpenDetails(p)}>
                <Info className="w-4 h-4" /> Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
