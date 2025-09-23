"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import Stepper from "@/components/Stepper";
import toast from "react-hot-toast";

type TravelerDraft = { full_name: string; role: "PUBLIC"|"EARLY_BIRD"|"ARTIST"|"SBS_STAFF"|"CCC_STAFF" };

export default function Page() {
  const params = useParams<{ ref: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const bookingId = sp.get("bookingId") || crypto.randomUUID();

  const [rows, setRows] = useState<TravelerDraft[]>([{ full_name: "", role: "PUBLIC" }]);

  function addRow() { setRows([...rows, { full_name: "", role: "PUBLIC" }]); }
  function update(i:number, patch: Partial<TravelerDraft>) {
    const next = [...rows]; next[i] = { ...next[i], ...patch }; setRows(next);
  }
  function remove(i:number) {
    if (rows.length === 1) return;
    setRows(rows.filter((_,idx)=> idx !== i));
  }

  function saveAndContinue() {
    const travelers = rows.filter(r => r.full_name.trim().length > 1);
    if (travelers.length === 0) { toast.error("Add at least one traveler"); return; }
    toast.success("Travelers saved (placeholder)");
    router.push(`/booking/${params.ref}/layout?bookingId=${bookingId}`);
  }

  return (
    <div className="max-w-2xl">
      <Stepper refCode={params.ref} />
      <h1 className="text-2xl font-semibold mb-4">Travelers</h1>
      <p className="text-sm text-neutral-600 mb-3">Add everyone who will share your cabin(s).</p>
      <div className="grid gap-4">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 grid gap-3">
            <div>
              <Label>Full name</Label>
              <Input value={r.full_name} onChange={e=>update(i,{ full_name: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={r.role} onChange={e=>update(i,{ role: e.target.value as any })}>
                <option value="PUBLIC">Public</option>
                <option value="EARLY_BIRD">Early Bird</option>
                <option value="ARTIST">Artist</option>
                <option value="SBS_STAFF">SBS Staff</option>
                <option value="CCC_STAFF">CCC Staff</option>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={()=>remove(i)} disabled={rows.length===1}>Remove</Button>
              {i === rows.length-1 && <Button onClick={addRow} variant="outline">Add traveler</Button>}
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <Button onClick={saveAndContinue}>Save & continue</Button>
          <Button variant="outline" onClick={()=>router.back()}>Back</Button>
        </div>
      </div>
    </div>
  );
}