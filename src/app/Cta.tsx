"use client";
import Link from "next/link";

export default function Cta() {
  return (
    <section className="bg-neutral-50 border-t">
      <div className="container py-10 md:py-14 max-w-4xl mx-auto text-center">
        <h3 className="text-2xl font-semibold">Ready to sail?</h3>
        <p className="text-neutral-700 mt-1">Lock in your spot in minutes.</p>
        <div className="mt-4">
          <Link href="/booking/start" className="btn btn-primary">
            Start Booking
          </Link>
        </div>
      </div>
    </section>
  );
}
