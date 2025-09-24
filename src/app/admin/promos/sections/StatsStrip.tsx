/* Defensive stats strip: shows your existing “Loading…” card until stats are valid */
export default function StatsStrip({ stats }: { stats: any }) {
  const hasValid =
    stats &&
    stats.created &&
    typeof stats.created.early_bird === "number" &&
    stats.used &&
    typeof stats.used.early_bird === "number" &&
    stats.caps;

  if (!hasValid) {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-neutral-700">Here’s the current promo code status</div>
        <div className="text-neutral-500 mt-2">Loading...</div>
      </section>
    );
  }

  const created = stats.created;
  const used = stats.used;
  const caps = stats.caps;

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="space-y-2">
        <div className="text-base text-neutral-700 font-medium">Early Bird codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{created.early_bird}</span> / {caps.early_bird ?? "—"} created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{used.early_bird}</span> / {created.early_bird} used
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-base text-neutral-700 font-medium">Artist codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{created.artist}</span> / {caps.artist ?? "—"} created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{used.artist}</span> / {created.artist} used
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-base text-neutral-700 font-medium">Staff codes</div>
        <div className="text-neutral-700">
          <span className="font-semibold">{created.staff}</span> / {caps.staff ?? "—"} created
        </div>
        <div className="text-neutral-600">
          <span className="font-semibold">{used.staff}</span> / {created.staff} used
        </div>
      </div>
    </section>
  );
}
