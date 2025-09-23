import { readDraft } from "@/lib/clientDraft";
export default function Page() {
  const d = readDraft();
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Manage My Booking</h1>
      <div className="rounded-xl border bg-white p-4">
        <p className="font-medium">Booking Summary</p>
        <p className="text-sm text-neutral-700">Reference: {d?.ref ?? "ABC-1234"}</p>
        <p className="text-sm text-neutral-700">Category: {d?.cabins?.category ?? "—"}</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="font-medium">Payments</p>
        <p className="text-sm text-neutral-700">History (placeholder) • <a className="underline" href="/booking/payment">Make a payment</a></p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="font-medium">Documents</p>
        <p className="text-sm text-neutral-700">Upload passports and receipts (placeholder)</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="font-medium">Contact Details</p>
        <p className="text-sm text-neutral-700">Edit phone/language (placeholder)</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="font-medium">Add-ons</p>
        <p className="text-sm text-neutral-700">Your selections: {(d?.addOns||[]).join(", ") || "—"}</p>
      </div>
    </div>
  );
}