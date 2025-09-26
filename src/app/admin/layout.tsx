import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between">
          <div className="text-sm text-neutral-700">Admin</div>
          <Link href="/admin/logout" className="text-sm text-blue-700 hover:underline">Log out</Link>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 flex-1">
        {children}
      </main>
    </div>
  );
}
