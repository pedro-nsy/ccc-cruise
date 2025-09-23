"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import Button from "@/components/ui/Button";
import Stepper from "@/components/Stepper";
import toast from "react-hot-toast";

type TRow = {
  traveler_id: string; full_name: string; role: string;
  category: string; occupancy: number;
  public_price_mxn: number; final_price_mxn: number; schedule: { label: string; dueDate: string; amount: number }[];
};

export default function Page() {
  const params = useParams<{ ref: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const bookingId = sp.get("bookingId") || "demo";

  // placeholder data
  const data = useMemo(()=>{
    const today = new Date();
    const iso = (d: Date)=> d.toISOString().slice(0,10);
    const addDays = (n:number)=> new Date(today.getTime()+n*86400000);
    const t: TRow[] = [
      { traveler_id:"t1", full_name:"Alice Artist", role:"ARTIST", category:"BALCONY", occupancy:2,
        public_price_mxn:34000, final_price_mxn:17000,
        schedule:[{label:"Deposit", dueDate: iso(addDays(0)), amount:8500},{label:"Balance", dueDate: iso(addDays(60)), amount:8500}]},
      { traveler_id:"t2", full_name:"Eddie EB", role:"EARLY_BIRD", category:"BALCONY", occupancy:2,
        public_price_mxn:34000, final_price_mxn:30000,
        schedule:[{label:"Deposit", dueDate: iso(addDays(0)), amount:3000},{label:"Balance", dueDate: iso(addDays(60)), amount:27000}]},
    ];
    const totalsByDate: Record<string, number> = {};
    for (const row of t) for (const s of row.schedule) totalsByDate[s.dueDate] = (totalsByDate[s.dueDate]||0)+s.amount;
    return { booking_id: bookingId, category: "BALCONY", currency:"MXN", travelers:t, totalsByDate };
  }, [bookingId]);

  function pay(mode:"deposit"|"full") {
    toast("Payments not wired yet (placeholder).");
  }

  return (
    <div className="max-w-3xl">
      <Stepper refCode={params.ref} />
      <h1 className="text-2xl font-semibold mb-4">Review & payments</h1>
      <div className="grid gap-4">
        {data.travelers.map(t => (
          <div key={t.traveler_id} className="rounded-xl border bg-white p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{t.full_name}</p>
                <p className="text-sm text-neutral-500">{t.role} • {t.category} • {t.occupancy}p cabin</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Public</p>
                <p className="font-medium">MXN {t.public_price_mxn.toLocaleString()}</p>
                <p className="text-sm text-neutral-500 mt-2">Your price</p>
                <p className="font-semibold">MXN {t.final_price_mxn.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm text-neutral-600">Schedule</p>
              <ul className="mt-1 grid gap-1 text-sm">
                {t.schedule.map((s, i)=>(
                  <li key={i} className="flex justify-between">
                    <span>{s.label} • {s.dueDate}</span>
                    <span>MXN {s.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-neutral-600 mb-1">Totals by due date</p>
          <ul className="grid gap-1 text-sm">
            {Object.entries(data.totalsByDate).sort().map(([d,amt])=>(
              <li key={d} className="flex justify-between">
                <span>{d}</span><span>MXN {amt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3">
          <Button onClick={()=>pay("deposit")}>Pay deposit</Button>
          <Button variant="outline" onClick={()=>pay("full")}>Pay in full</Button>
          <Button variant="ghost" onClick={()=>router.push(`/booking/${params.ref}/pay/later`)}>Pay later</Button>
        </div>
      </div>
    </div>
  );
}