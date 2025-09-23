import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Christian Community Choir Homecoming Cruise 2026",
  description: "Sing. Sail. Celebrate—together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        {/* top nav */}
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold">
              CCC Cruise 2026
            </Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/#learn" className="hover:text-brand-700">Learn More</Link>
              <Link href="/#faq" className="hover:text-brand-700">FAQ</Link>
              <Link href="/#contact" className="hover:text-brand-700">Contact</Link>
              <Link href="/booking/start" className="btn btn-primary">Start Booking</Link>
            </nav>
            <Link href="/booking/start" className="md:hidden btn btn-primary">Book</Link>
          </div>
        </header>

        {/* page content */}
        <main className="flex-1">{children}</main>

        {/* footer */}
        <footer className="border-t">
          <div className="container py-8 text-sm text-neutral-600">
            Organized by Christian Community Choir · Managed by InterTravel · © {new Date().getFullYear()}
          </div>
        </footer>
      </body>
    </html>
  );
}
