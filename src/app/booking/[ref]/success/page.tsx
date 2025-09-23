export default function Page() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-2">Thank you — your booking is confirmed</h1>
      <p className="text-sm text-neutral-700">Reference <strong>[REF]</strong>. We have sent a confirmation email.</p>
      <div className="mt-4 grid gap-2 text-sm text-neutral-700">
        <p>What happens next:</p>
        <ul className="list-disc pl-5">
          <li>If you paid a deposit, your balance is due on [date].</li>
          <li>We will email final documents closer to sailing.</li>
        </ul>
      </div>
    </div>
  );
}