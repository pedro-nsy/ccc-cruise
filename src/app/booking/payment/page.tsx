"use client";

import Stepper from "@/components/Stepper";
import Button from "@/components/ui/Button";
import { readDraft, writeDraft } from "@/lib/clientDraft";

export default function Page() {
  function pick(m:"card"|"offline"){
    writeDraft({ paymentMethod: m });
    location.assign(m==="card" ? "/booking/payment/card" : "/booking/payment/offline");
  }
  return (
    <div className="max-w-xl">
      <Stepper />
      <h1 className="text-2xl font-semibold mb-4">Choose how you’d like to pay</h1>
      <div className="grid gap-3">
        <Button onClick={()=>pick("card")}>Pay with Card (Stripe)</Button>
        <Button variant="outline" onClick={()=>pick("offline")}>Bank Transfer / Cash</Button>
      </div>
      <div className="mt-4">
        <Button variant="outline" onClick={()=>history.back()}>Back</Button>
      </div>
    </div>
  );
}