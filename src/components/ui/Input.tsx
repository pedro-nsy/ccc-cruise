import cn from "classnames";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-800/30")} {...props} />;
}
export function Label({ children }: { children: React.ReactNode }) { return <label className="block text-sm font-medium mb-1">{children}</label>; }
export function FieldError({ children }: { children?: React.ReactNode }) { if (!children) return null; return <p className="mt-1 text-xs text-red-600">{children}</p>; }