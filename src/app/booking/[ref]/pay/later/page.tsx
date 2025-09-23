export default function Page() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-3">Pay later (bank / cash)</h1>
      <p className="text-sm text-neutral-700">We will hold your reservation for 48 hours.</p>
      <ul className="list-disc pl-5 text-sm text-neutral-700 mt-3">
        <li>Use your booking reference in the payment note.</li>
        <li>Send proof of payment to payments@ccc.example.</li>
        <li>We will confirm by email once received.</li>
      </ul>
      <p className="mt-4 text-sm text-neutral-600">*This page is a placeholder. Payment logic will be wired later.</p>
    </div>
  );
}