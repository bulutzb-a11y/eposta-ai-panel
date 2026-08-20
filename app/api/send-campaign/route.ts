import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(supabaseUrl!, supabaseKey!);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { campaignId, targetEmail, targetName } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Kampanya ID gerekli.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 1. SMTP Ayarlarını Çek
    const { data: smtpData, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (smtpError || !smtpData || !smtpData.email || !smtpData.password) {
      return NextResponse.json({ 
        error: 'SMTP E-posta ayarları bulunamadı. Lütfen "Hesabı Bağla" menüsünden hesabınızı bağlayın.' 
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpData.host || 'mail.kurumsaleposta.com',
      port: Number(smtpData.port) || 587,
      secure: false,
      auth: { user: smtpData.email, pass: smtpData.password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    // 2. Kampanyayı Çek
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign || !campaign.templates) {
      return NextResponse.json({ error: 'Kampanya bulunamadı.' }, { status: 404 });
    }

    // 3. Alıcı Listesi
    let contactsList: { email: string; name: string }[] = [];
    if (targetEmail) {
      contactsList = [{ email: targetEmail, name: targetName || 'Değerli Müşterimiz' }];
    } else {
      const { data: allContacts } = await supabase.from('contacts').select('email, name');
      contactsList = allContacts || [];
    }

    const templates = campaign.templates;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contactsList.length; i++) {
      const contact = contactsList[i];
      if (!contact.email) continue;

      const selectedTemplate = templates[i % templates.length];
      const personName = contact.name?.trim() ? contact.name : 'Değerli Müşterimiz';

      const personalizedSubject = selectedTemplate.subject.replace(/\{\{ad_soyad\}\}/g, personName);
      const personalizedText = selectedTemplate.content.replace(/\{\{ad_soyad\}\}/g, personName);

      // 👉 VERİTABANI LOG (İSTATİSTİK) KAYDI VE HATA YAKALAMA SİSTEMİ
      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert([{ 
           campaign_id: campaignId, 
           recipient_email: contact.email, 
           status: 'delivered' 
        }])
        .select()
        .single();

      // LOG KONTROLÜ
      if (logError) {
        console.error('❌ VERİTABANI KAYIT HATASI:', logError.message || logError);
      } else {
        console.log('✅ VERİTABANINA LOG EKLENDİ, ID:', logData?.id);
      }

      // Takip Pikselini Oluştur
      const trackingPixelUrl = `${appUrl}/api/track/open?id=${logData?.id || ''}`;
      const htmlBody = `
        <div style="font-family: sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
          ${personalizedText.replace(/\n/g, '<br/>')}
          <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Kampanya Sistemi" <${smtpData.email}>`,
          to: contact.email,
          subject: personalizedSubject,
          text: personalizedText,
          html: htmlBody,
        });
        successCount++;
        
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (e: any) {
        console.error('Mail Gönderim Hatası:', e);
        failedCount++;
        if (logData?.id) {
          await supabase.from('email_logs').update({ status: 'failed' }).eq('id', logData.id);
        }
      }
    }

    if (!targetEmail) {
      await supabase.from('campaigns').update({ status: 'Gönderildi' }).eq('id', campaignId);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${successCount} kişiye e-posta iletildi.${failedCount > 0 ? ` (${failedCount} hata)` : ''}` 
    });

  } catch (error: any) {
    console.error('Genel Hata:', error);
    return NextResponse.json({ error: error?.message || 'Hata oluştu.' }, { status: 500 });
  }
}