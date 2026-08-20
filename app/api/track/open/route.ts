import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// 1x1 Piksel boyutunda tamamen şeffaf ve görünmez görsel (Takip Pikseli)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // 'open' veya 'click'
  const email = searchParams.get('email');
  const campaignId = searchParams.get('campaignId');
  const targetUrl = searchParams.get('url');

  // Bilgileri Supabase veritabanına kaydet
  if (supabase && email && campaignId) {
    await supabase.from('tracking_logs').insert([
      { 
        event_type: action, 
        email: email, 
        campaign_id: campaignId, 
        target_url: targetUrl || null 
      }
    ]);
  }

  // Eğer istek "mail açıldı" isteğiyse görünmez görseli döndür
  if (action === 'open') {
    return new NextResponse(TRANSPARENT_GIF, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  }

  // Eğer istek "linke tıklandı" isteğiyse kaydı alıp asıl linke yönlendir
  if (action === 'click' && targetUrl) {
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.json({ success: true });
}