"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import Stepper from "@/components/Stepper";
import toast from "react-hot-toast";

export default function Page() {
  const params = useParams<{ ref: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const bookingId = sp.get("bookingId") || crypto.randomUUID();

  // placeholder travelers
  const travelerIds = useMemo(()=> ["t1","t2","t3"], []);
  const [category, setCategory] = useState<"INTERIOR"|"OCEAN"|"BALCONY">("BALCONY");

  const autoCabins = useMemo(()=>{
    const ids = travelerIds;
    const cabins:any[] = [];
    for (let i=0; i<ids.length; i+=4) {
      cabins.push({ occupancy: Math.min(4, ids.length - i), travelerIds: ids.slice(i, i+4) });
    }
    if (cabins.length === 0) cabins.push({ occupancy: 2, travelerIds: [] });
    return cabins;
  }, [travelerIds]);

  function save() {
    toast.success("Layout saved (placeholder)");
    router.push(`/booking/${params.ref}/review?bookingId=${bookingId}`);
  }

  return (
    <div className="max-w-2xl">
      <Stepper refCode={params.ref} />
      <h1 className="text-2xl font-semibold mb-4">Cabin layout</h1>
      <div className="rounded-xl border bg-white p-4 grid gap-4">
        <div>
          <p className="text-sm text-neutral-600 mb-2">Category</p>
          <Select value={category} onChange={e=>setCategory(e.target.value as any)}>
            <option value="INTERIOR">Interior</option>
            <option value="OCEAN">Ocean</option>
            <option value="BALCONY">Balcony</option>
          </Select>
        </div>
        <div>
          <p className="text-sm text-neutral-600">We will automatically group travelers into cabins of up to 4.</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
            {autoCabins.map((c, idx)=>(
              <li key={idx}>Cabin {idx+1}: occupancy {c.occupancy} — {c.travelerIds.length} assigned</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={save}>Save & continue</Button>
        <Button variant="outline" onClick={()=>router.back()}>Back</Button>
      </div>
    </div>
  );
}