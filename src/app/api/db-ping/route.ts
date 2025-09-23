export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return NextResponse.json({ ok: true, buckets: data?.map(b => b.name) ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}