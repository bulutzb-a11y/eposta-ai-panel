"use client";

import { useEffect, useRef } from 'react';

export default function BackgroundMailer() {
  const isProcessing = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isProcessing.current) return;

      // 1. Anti-Spam: İki mail arası en az 30 saniye bekle
      const lastSendStr = localStorage.getItem('my_mailer_last_send');
      if (lastSendStr) {
        const timeSinceLastSend = Date.now() - parseInt(lastSendStr);
        if (timeSinceLastSend < 30000) return;
      }

      const campsData = localStorage.getItem('my_email_campaigns');
      if (!campsData) return;
      let campaigns = JSON.parse(campsData);

      const activeCampIndex = campaigns.findIndex((c: any) => c.status === 'sending');
      if (activeCampIndex === -1) return;
      
      const camp = campaigns[activeCampIndex];

      // 2. Mesai Saati Kontrolü (09:00 - 16:30)
      if (camp.schedule_type !== 'now') {
        const now = new Date();
        const totalMins = now.getHours() * 60 + now.getMinutes();
        if (totalMins < 540 || totalMins > 990) { 
           camp.status = 'paused_time';
           localStorage.setItem('my_email_campaigns', JSON.stringify(campaigns));
           return;
        }
      }

      // 3. Bekleyen alıcı kontrolü
      if (!camp.pending_recipients || camp.pending_recipients.length === 0) {
         camp.status = (camp.sent_count && camp.sent_count > 0) ? 'completed' : 'failed';
         localStorage.setItem('my_email_campaigns', JSON.stringify(campaigns));
         return;
      }

      isProcessing.current = true;
      
      try {
         const nextRecipient = camp.pending_recipients[0]; 
         const chosenTemplate = camp.selected_templates[camp.sent_count % camp.selected_templates.length];
         
         // 4. İsim kişiselleştirme
         let personalizedHtml = chosenTemplate.html_content.replace(/\{\{isim\}\}/g, nextRecipient.name || 'Değerli Üyemiz');
         let personalizedSubject = chosenTemplate.subject.replace(/\{\{isim\}\}/g, nextRecipient.name || '');

         // 5. Okunma (Open) Pikselini En Alta Ekle (Tıklama link takibi kaldırıldı)
         try {
             const baseUrl = window.location.origin;
             const pixelUrl = `${baseUrl}/api/track?action=open&email=${encodeURIComponent(nextRecipient.email)}&campaignId=${camp.id}`;
             const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
             
             if (personalizedHtml.includes('</body>')) {
                 personalizedHtml = personalizedHtml.replace('</body>', `${trackingPixel}</body>`);
             } else {
                 personalizedHtml += trackingPixel;
             }
         } catch (e) {
             console.error("Okunma pikseli eklenemedi:", e);
         }

         // 6. E-Posta Gönderim İsteği
         const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: nextRecipient.email,
              subject: personalizedSubject,
              html: personalizedHtml,
              smtpSettings: {
                senderName: 'Cumhuriyet İçin Koş',
                user: 'tanitim@cumhuriyeticinkos.com',
                pass: 'I:Iz-3.Bi9Gk:u65',
                host: 'mail.kurumsaleposta.com',
                port: 465
              }
            })
         });

         const data = await res.json();

         // 7. Durum Güncelleme
         const freshData = localStorage.getItem('my_email_campaigns');
         if (freshData) campaigns = JSON.parse(freshData);
         const freshCamp = campaigns.find((c:any) => c.id === camp.id);

         if (freshCamp && freshCamp.status !== 'stopped') {
           freshCamp.pending_recipients.shift();

           if (data.success) {
             freshCamp.sent_count = (freshCamp.sent_count || 0) + 1;
             if (!freshCamp.sent_recipients) freshCamp.sent_recipients = [];
             freshCamp.sent_recipients.push({
               email: nextRecipient.email,
               name: nextRecipient.name,
               time: new Date().toLocaleTimeString('tr-TR'),
               date: new Date().toISOString()
             });
             
             const history = JSON.parse(localStorage.getItem('my_sent_email_history') || '[]');
             if (!history.includes(nextRecipient.email.toLowerCase())) {
                history.push(nextRecipient.email.toLowerCase());
                localStorage.setItem('my_sent_email_history', JSON.stringify(history));
             }
             localStorage.setItem('my_mailer_last_send', Date.now().toString());
           } else {
             if (!freshCamp.failed_recipients) freshCamp.failed_recipients = [];
             freshCamp.failed_recipients.push({
               email: nextRecipient.email,
               name: nextRecipient.name,
               error: data.error || 'Gönderilemedi'
             });
           }
           
           if (freshCamp.pending_recipients.length === 0) {
             freshCamp.status = (freshCamp.sent_count > 0) ? 'completed' : 'failed';
           }
           
           localStorage.setItem('my_email_campaigns', JSON.stringify(campaigns));
         }
      } catch(err) {
         console.error("Arka plan gönderim hatası:", err);
      } finally {
         isProcessing.current = false;
      }

    }, 2000); 

    return () => clearInterval(interval);
  }, []);

  return null;
}