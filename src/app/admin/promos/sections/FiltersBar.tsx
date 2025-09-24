export default function FiltersBar({
  q, type, status, used,
  setQ, setType, setStatus, setUsed,
  onSearch
}: {
  q: string; type: string; status: string; used: string;
  setQ: (v: string)=>void; setType: (v: string)=>void; setStatus: (v: string)=>void; setUsed: (v: string)=>void;
  onSearch: () => void;
}) {
  return (
    <div className="sticky top-20 z-10">
      <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="rounded-xl border border-neutral-300 px-3 py-2"
            placeholder="Search code or name…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border border-neutral-300 px-3 py-2"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="early_bird">Early Bird</option>
            <option value="artist">Artist</option>
            <option value="staff">Staff</option>
          </select>
          <select
            className="rounded-xl border border-neutral-300 px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="reserved">Reserved</option>
            <option value="consumed">Consumed</option>
          </select>
          <select
            className="rounded-xl border border-neutral-300 px-3 py-2"
            value={used}
            onChange={e => setUsed(e.target.value)}
          >
            <option value="">Used (all)</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={onSearch}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
