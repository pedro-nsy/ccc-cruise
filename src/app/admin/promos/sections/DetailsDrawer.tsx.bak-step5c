import { TypeChip, StatusChip } from "./chips";
import { fmtDate, yesNo, prettyPhone } from "./format";

export default function DetailsDrawer({
  row, usage, usageLoading, onClose
}: {
  row: any;
  usage: any[] | null;
  usageLoading: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-white border-l border-neutral-200 shadow-xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="font-mono text-lg font-semibold">{row.code}</div>
            <div className="flex items-center gap-2">
              <TypeChip t={row.type} />
              <StatusChip s={row.status} />
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Assigned */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Who it was assigned to</h3>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-neutral-600">Name</div>
              <div className="text-base text-neutral-700">{row.assigned_to_name || "Not assigned"}</div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-sm text-neutral-600">Email</div>
                  <div className="text-base text-neutral-700">{row.assigned_email || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Phone</div>
                  <div className="text-base text-neutral-700">{prettyPhone(row.assigned_phone)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Code info */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Code info</h3>
            <div className="rounded-2xl border bg-white p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-neutral-600">Created</div>
                <div className="text-base text-neutral-700">{fmtDate(row.created_at)}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Updated</div>
                <div className="text-base text-neutral-700">{fmtDate(row.updated_at)}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Used</div>
                <div className="text-base text-neutral-700">{yesNo(row.used_count)}</div>
              </div>
            </div>
          </section>

          {/* Code history */}
          <section className="space-y-2">
            <h3 className="text-lg font-medium">Code history</h3>
            <div className="rounded-2xl border bg-white p-4">
              {usageLoading ? (
                <div className="text-sm text-neutral-600">Loading…</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-neutral-700">
                      {row.created_by ? `Created by ${row.created_by}` : "Created"}
                    </div>
                    <div className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleString()}</div>
                  </div>

                  {!usage || usage.length === 0 ? (
                    <div className="text-sm text-neutral-600">No other events yet.</div>
                  ) : (
                    usage.map((u:any) => {
                      const when =
                        u.status === "reserved" ? u.reserved_at :
                        u.status === "consumed" ? u.consumed_at :
                        u.released_at;
                      const whenTxt = when ? new Date(when).toLocaleString() : "";
                      const travelerTxt = u.traveler_id ? ` (traveler ${u.traveler_id})` : "";
const line =
  u.status === "reserved"
    ? `Reserved for booking ${u.booking_ref}${travelerTxt}`
    : u.status === "consumed"
      ? "Consumed"
      : "Released";
                      return (
                        <div key={u.id} className="text-sm">
                          <div className="text-neutral-700">{line}</div>
                          <div className="text-xs text-neutral-500">{whenTxt}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
