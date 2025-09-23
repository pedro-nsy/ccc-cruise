import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const ref = req.cookies.get("ccc_ref")?.value;
  if (!ref) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
