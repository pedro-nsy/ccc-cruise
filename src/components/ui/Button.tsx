import cn from "classnames";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"outline"|"ghost" };
export default function Button({ className, variant="primary", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";
  const styles = { primary:"bg-black text-white hover:bg-neutral-800", outline:"border border-neutral-300 bg-white hover:bg-neutral-50", ghost:"hover:bg-neutral-100" }[variant];
  return <button className={cn(base, styles, className)} {...props} />;
}