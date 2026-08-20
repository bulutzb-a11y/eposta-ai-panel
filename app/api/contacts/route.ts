import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 });
  }
}

// Tekli veya Toplu Üye Ekle (Mükerrer e-postaları otomatik atlar)
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json().catch(() => ({}));

    // TypeScript için tipi açıkça any[] olarak tanımladık
    let recordsToInsert: any[] = [];

    if (Array.isArray(body)) {
      recordsToInsert = body
        .filter((item: any) => item.email && item.email.includes('@'))
        .map((item: any) => ({
          email: item.email.trim(),
          name: item.name ? item.name.trim() : '',
          first_name: item.first_name || item.name?.split(' ')[0] || '',
          last_name: item.last_name || item.name?.split(' ').slice(1).join(' ') || '',
          phone: item.phone || null,
          status: 'Aktif'
        }));
    } else if (body.email) {
      recordsToInsert = [{
        email: body.email.trim(),
        name: body.name ? body.name.trim() : '',
        first_name: body.first_name || body.name?.split(' ')[0] || '',
        last_name: body.last_name || body.name?.split(' ').slice(1).join(' ') || '',
        phone: body.phone || null,
        status: 'Aktif'
      }];
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi bulunamadı.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contacts')
      .upsert(recordsToInsert, { onConflict: 'email' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi eksik' }, { status: 400 });
    }

    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sunucu hatası' }, { status: 500 });
  }
}