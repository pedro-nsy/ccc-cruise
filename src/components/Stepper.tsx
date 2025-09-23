"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "classnames";

const STEPS = [
  {key:"start",       label:"Start",        href:"/booking/start"},
  {key:"promo",       label:"Promo",        href:"/booking/promo"},
  {key:"group-size",  label:"Group",        href:"/booking/group-size"},
  {key:"travelers",   label:"Travelers",    href:"/booking/travelers"},
  {key:"cabins",      label:"Cabins",       href:"/booking/cabins"},
  {key:"review",      label:"Review",       href:"/booking/review"},
  {key:"add-ons",     label:"Add-ons",      href:"/booking/add-ons"},
  {key:"payment",     label:"Payment",      href:"/booking/payment"},
  {key:"confirmation",label:"Confirm",      href:"/booking/confirmation"},
];

export default function Stepper() {
  const path = usePathname();
  return (
    <nav aria-label="Booking steps" className="mb-6">
      <ol className="stepper">
        {STEPS.map((s,i)=>{
          const active = path?.includes(s.key);
          return (
            <li key={s.key} className={clsx("stepper-item", active && "stepper-active")}>
              <Link href={s.href} className="flex items-center gap-2">
                <span className="stepper-dot border-neutral-300">{i+1}</span>
                <span className="stepper-label">{s.label}</span>
              </Link>
              {i<STEPS.length-1 && <span className="stepper-line" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}