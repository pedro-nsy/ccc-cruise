export const dynamic = "force-dynamic";

type PromoType = "ARTIST" | "CCC_STAFF" | "SBS_STAFF";
type Result = { code: string; type: PromoType | null; valid: boolean; message: string };

function classify(raw: string): Result {
  const code = (raw || "").trim().toUpperCase();
  if (!code) return { code, type: null, valid: false, message: "Empty code" };
  if (code.startsWith("SBS")) return { code, type: "SBS_STAFF", valid: true, message: "SBS Staff code" };
  if (code.startsWith("ART")) return { code, type: "ARTIST", valid: true, message: "Artist code" };
  if (code.startsWith("CCC")) return { code, type: "CCC_STAFF", valid: true, message: "CCC Staff code" };
  return { code, type: null, valid: false, message: "Code not recognized" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const codes: string[] = Array.isArray(body?.codes) ? body.codes : [];

    // First pass: classify all
    const preliminary = codes.map(classify);

    // Second pass: one-time use per code (dedupe case-insensitively).
    const seen = new Set<string>();
    const results = preliminary.map((r) => {
      const key = r.code.toUpperCase();
      if (!key) return r;
      if (seen.has(key)) {
        return { ...r, valid: false, type: r.type, message: "Duplicate code (each code can be used once)" };
      }
      seen.add(key);
      return r;
    });

    const hasSbs = results.some(r => r.valid && r.type === "SBS_STAFF");
    const hasArtist = results.some(r => r.valid && r.type === "ARTIST");
    const hasCcc = results.some(r => r.valid && r.type === "CCC_STAFF");

    // SBS exclusivity applies across *valid* codes
    const mixBlocked = hasSbs && (hasArtist || hasCcc);

    const anyInvalid = results.some(r => !r.valid);

    return new Response(JSON.stringify({
      results,
      flags: { hasSbs, hasArtist, hasCcc, mixBlocked, anyInvalid }
    }), { status: 200, headers: { "content-type": "application/json" }});
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
}
