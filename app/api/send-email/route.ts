import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, html, smtpSettings } = await req.json();

    const host = smtpSettings?.host || 'mail.kurumsaleposta.com';
    const user = smtpSettings?.user || 'tanitim@cumhuriyeticinkos.com';
    const pass = smtpSettings?.pass || 'I:Iz-3.Bi9Gk:u65';
    // Kurumsal e-posta SSL bağlantısı için 465 portu
    const port = 465;

    console.log(`\n--- [MAIL DENEMESİ] ---`);
    console.log(`Sunucu: ${host}:${port}`);
    console.log(`Gönderen: ${user}`);
    console.log(`Alıcı: ${to}`);

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: true, // 465 portu için SSL zorunlu
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 1. Önce SMTP Bağlantısını Doğrula
    await transporter.verify();
    console.log("✅ SMTP Sunucusuna başarıyla bağlanıldı!");

    // 2. Maili Gönder
    const info = await transporter.sendMail({
      from: `"Cumhuriyet İçin Koş" <${user}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Mail Gönderildi! Message ID:", info.messageId);
    console.log(`-----------------------\n`);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("❌ GERÇEK SMTP HATASI:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: `SMTP Hatası (${error.code || 'Bilinmeyen'}): ${error.message}` 
    }, { status: 500 });
  }
}