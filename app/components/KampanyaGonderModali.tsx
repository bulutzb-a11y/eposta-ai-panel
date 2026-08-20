"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface Template {
  id: string;
  subject: string;
  html_content: string;
}

interface Recipient {
  email: string;
  name: string;
}

export default function KampanyaGonderModali({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Örnek Alıcı Listesi (Supabase 'contacts' veya 'users' tablonuzdan da çekebilirsiniz)
  const [recipients] = useState<Recipient[]>([
    { email: "ahmet@example.com", name: "Ahmet Yılmaz" },
    { email: "ayse@example.com", name: "Ayşe Kaya" },
    { email: "mehmet@example.com", name: "Mehmet Demir" }
  ]);

  // Sayfa açıldığında kayıtlı taslakları çek
  useEffect(() => {
    const localData = localStorage.getItem('my_email_templates');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setTemplates(parsed);
        if (parsed.length > 0) setSelectedTemplateId(parsed[0].id);
      } catch (e) {
        console.error("Localstorage okuma hatası", e);
      }
    }

    async function fetchFromSupabase() {
      if (supabase) {
        const { data } = await supabase.from('templates').select('*');
        if (data && data.length > 0) {
          setTemplates(data);
          if (!selectedTemplateId) setSelectedTemplateId(data[0].id);
        }
      }
    }
    fetchFromSupabase();
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Gönderim Fonksiyonu
  const handleStartCampaign = async () => {
    if (!selectedTemplate) {
      alert("Lütfen gönderilecek bir taslak seçin.");
      return;
    }

    setIsSending(true);

    try {
      // Her alıcı için kişiselleştirilmiş şablon oluşturulur
      for (const recipient of recipients) {
        // {{isim}} etiketini alıcının gerçek ismiyle değiştir
        const personalizedHtml = selectedTemplate.html_content.replace(/\{\{isim\}\}/g, recipient.name);
        
        console.log(`Gönderiliyor -> Alıcı: ${recipient.email} | İsim: ${recipient.name}`);
        console.log(`Hazırlanan HTML İçeriği:`, personalizedHtml);

        // BURAYA MEVCUT MAİL GÖNDERME API/SUPABASE İŞLEMİNİZ GELECEK
        /* 
        await fetch('/api/send-email', {
          method: 'POST',
          body: JSON.stringify({
            to: recipient.email,
            subject: selectedTemplate.subject,
            html: personalizedHtml
          })
        });
        */
      }

      setSendSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: any) {
      alert("Gönderim sırasında hata oluştu: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Üst Başlık */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">🚀 E-Posta Kampanyası Başlat</h2>
            <p className="text-sm text-slate-500 mt-1">Taslak seçin ve toplu gönderimi başlatın.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Taslak Seçim Kutusu */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Gönderilecek Taslağı Seçin</label>
            {templates.length === 0 ? (
              <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                Lütfen önce Kampanyalar sayfasından en az bir taslak ekleyin.
              </p>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subject}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Hedef Kitle Özeti */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Hedef Kitle</span>
            <p className="text-sm font-semibold text-slate-700">
              Toplam <span className="text-indigo-600 font-bold">{recipients.length}</span> alıcıya kişiselleştirilmiş mail gönderilecek.
            </p>
          </div>

          {/* Şablon Önizlemesi */}
          {selectedTemplate && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">ÖNİZLEME (Örnek Alıcı: {recipients[0]?.name})</span>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto bg-white text-xs">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: selectedTemplate.html_content.replace(/\{\{isim\}\}/g, recipients[0]?.name || 'Değerli Üyemiz') 
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Alt Aksiyon Butonları */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium">
            İptal
          </button>
          
          <button 
            onClick={handleStartCampaign}
            disabled={isSending || templates.length === 0}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
          >
            {isSending ? (
              <>
                <span className="animate-spin">🌀</span>
                Gönderiliyor...
              </>
            ) : sendSuccess ? (
              "✅ Gönderim Tamamlandı!"
            ) : (
              "Kampanyayı Başlat"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}