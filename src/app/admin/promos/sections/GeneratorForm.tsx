export default function GeneratorForm({
  genType, setGenType, qty, setQty, meta, setMeta, genMsg, onSubmit
}: {
  genType: ""|"early_bird"|"artist"|"staff";
  setGenType: (v: ""|"early_bird"|"artist"|"staff")=>void;
  qty: number; setQty: (n: number)=>void;
  meta: { name: string; email: string; phone: string; note: string };
  setMeta: (f: (m: typeof meta)=>typeof meta) => void;
  genMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 space-y-4">
      <h2 className="text-lg font-medium">Create codes</h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <select className="rounded-xl border border-neutral-300 px-3 py-2"
                value={genType} onChange={e => setGenType(e.target.value as any)}>
          <option value="">Select type</option>
          <option value="early_bird">Early Bird</option>
          <option value="artist">Artist</option>
          <option value="staff">Staff</option>
        </select>
        <input type="number" min={1} max={500}
               className="rounded-xl border border-neutral-300 px-3 py-2"
               value={qty} onChange={e => setQty(parseInt(e.target.value || "1",10))} />
        <input placeholder="Assigned to (name)" className="rounded-xl border border-neutral-300 px-3 py-2"
               value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} />
        <input placeholder="Assigned email" className="rounded-xl border border-neutral-300 px-3 py-2"
               value={meta.email} onChange={e => setMeta(m => ({ ...m, email: e.target.value }))} />
        <input placeholder="Assigned phone" className="rounded-xl border border-neutral-300 px-3 py-2"
               value={meta.phone} onChange={e => setMeta(m => ({ ...m, phone: e.target.value }))} />
        <input placeholder="Note" className="rounded-xl border border-neutral-300 px-3 py-2"
               value={meta.note} onChange={e => setMeta(m => ({ ...m, note: e.target.value }))} />
      </div>
      {genMsg && <div className="text-sm text-neutral-700">{genMsg}</div>}
      <div className="flex items-center justify-end">
        <button className="btn btn-primary">Create</button>
      </div>
    </form>
  );
}
