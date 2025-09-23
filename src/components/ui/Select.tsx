export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800/30" {...props} />;
}