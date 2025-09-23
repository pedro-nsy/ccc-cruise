export default function Toggle({
  left="English", right="Deutsch", value="left", onChange
}:{left?:string;right?:string;value:"left"|"right";onChange:(v:"left"|"right")=>void}) {
  return (
    <div className="inline-flex rounded-xl border border-neutral-300 overflow-hidden">
      <button type="button" onClick={()=>onChange("left")} className={`px-3 py-1 text-sm ${value==="left"?"bg-black text-white":"bg-white"}`}>{left}</button>
      <button type="button" onClick={()=>onChange("right")} className={`px-3 py-1 text-sm ${value==="right"?"bg-black text-white":"bg-white"}`}>{right}</button>
    </div>
  );
}