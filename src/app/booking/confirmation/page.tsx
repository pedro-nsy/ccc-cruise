import { readDraft, clearDraft } from "@/lib/clientDraft";
export default function Page() {
  const d = readDraft();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">You’re all set!</h1>
      <p className="text-sm text-neutral-700">Thank you—your booking has been created.</p>
      <p className="text-sm text-neutral-700 mt-1">Booking reference: <strong>{d?.ref ?? "ABC-1234"}</strong></p>
      <div className="rounded-xl border bg-white p-3 mt-3">
        <p className="font-medium">Travelers & cabins</p>
        <p className="text-sm text-neutral-700">Compact summary (placeholder)</p>
      </div>
      <div className="rounded-xl border bg-white p-3 mt-3">
        <p className="font-medium">Amount paid / Next step</p>
        <p className="text-sm text-neutral-700">If Stripe: “Paid today: MXN X,XXX.XX”. If Bank/Cash: “Complete payment within 48 hours.”</p>
      </div>
      <div className="mt-4 grid gap-2">
        <a className="rounded-xl bg-black text-white px-4 py-2 text-sm text-center" href="/portal">Access My Booking (portal)</a>
        <a className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-center" href="/">Back to homepage</a>
      </div>
    </div>
  );
}