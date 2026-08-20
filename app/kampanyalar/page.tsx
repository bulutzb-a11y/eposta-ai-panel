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
  created_at: string;
}

function TaslakYuklemeModali({ onClose, onSaveSuccess }: { onClose: () => void; onSaveSuccess: (newTemplate: Template) => void; }) {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setHtmlContent(event.target.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
    if (!subject || !htmlContent) {
      alert("Lütfen bir e-posta konusu girin ve HTML içeriği ekleyin.");
      return;
    }

    setIsSaving(true);
    const newTemplate: Template = {
      id: Date.now().toString(),
      subject,
      html_content: htmlContent,
      created_at: new Date().toLocaleDateString('tr-TR')
    };

    try {
      if (supabase) {
        await supabase.from('templates').insert([{ subject, html_content: htmlContent }]);
      }
      onSaveSuccess(newTemplate);
      alert("Taslak kalıcı olarak kaydedildi!");
      onClose();
    } catch (error: any) {
      onSaveSuccess(newTemplate);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dışarıdan Taslak Yükle</h2>
            <p className="text-sm text-slate-500 mt-1">HTML dosyanızı seçin veya kodunuzu yapıştırın</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-Posta Konusu</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Örn: Cumhuriyet Koşusu!" className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500" />
            </div>

            <div className="p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50 text-center">
              <label className="cursor-pointer block w-full h-full">
                <span className="block text-sm font-semibold text-indigo-700">Bilgisayardan .html Yükle</span>
                <input type="file" accept=".html" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Veya HTML Kodunu Yapıştırın</label>
              <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="<div style='...'>...</div>" className="w-full h-48 px-4 py-3 border border-slate-300 rounded-xl font-mono text-xs outline-none focus:border-indigo-500"></textarea>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl flex flex-col bg-slate-50 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-xs text-slate-500 uppercase">Canlı Önizleme</div>
            <div className="flex-1 p-4 overflow-y-auto bg-white">
              {htmlContent ? <div dangerouslySetInnerHTML={{ __html: htmlContent }} /> : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tasarım burada görünecek</div>}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium">İptal</button>
          <button onClick={handleSave} disabled={isSaving || !subject || !htmlContent} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KampanyalarPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaign'>('campaign');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  
  // SADECE HEDEF KİTLE SEÇENEKLERİNE 'group' VE SEÇİLİ GRUP STATE'İ EKLENDİ
  const [targetAudience, setTargetAudience] = useState<'all' | 'group' | 'custom'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // SİSTEMDEKİ TÜM MEVCUT GRUPLARI VE ÜYE SAYILARINI HESAPLAMA
  const existingGroups = Array.from(new Set(contacts.map((c: any) => c.group_name || 'Genel')));

  useEffect(() => {
    localStorage.setItem('my_email_connection', JSON.stringify({
      senderName: 'Cumhuriyet İçin Koş',
      email: 'tanitim@cumhuriyeticinkos.com',
      domain: 'mail.kurumsaleposta.com',
      password: 'I:Iz-3.Bi9Gk:u65',
      isConnected: true
    }));

    const localData = localStorage.getItem('my_email_templates');
    if (localData) {
      try {
        setTemplates(JSON.parse(localData));
        setSelectedTemplateIds(JSON.parse(localData).map((t: Template) => t.id));
      } catch (e) {}
    }

    async function fetchAllContactsFromSupabase() {
      if (!supabase) return;
      let allContacts: any[] = [];
      let start = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .range(start, start + step - 1);

        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          start += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allContacts.length > 0) {
        setContacts(allContacts);
        localStorage.setItem('my_email_members', JSON.stringify(allContacts));
        // Varsayılan ilk grubu seç
        const groups = Array.from(new Set(allContacts.map((c: any) => c.group_name || 'Genel')));
        if (groups.length > 0) setSelectedGroup(groups[0]);
      }
    }
    
    const localMembers = localStorage.getItem('my_email_members');
    if (localMembers) {
      try { 
        const parsed = JSON.parse(localMembers);
        setContacts(parsed);
        const groups = Array.from(new Set(parsed.map((c: any) => c.group_name || 'Genel')));
        if (groups.length > 0) setSelectedGroup(groups[0]);
      } catch (e) {}
    }
    
    fetchAllContactsFromSupabase();

    // ÜYELER SAYFASINDAN GELEN SEÇİMİ YAKALA
    const pending = localStorage.getItem('pendingQueueIds');
    if (pending) {
      try {
        const ids = JSON.parse(pending);
        if (Array.isArray(ids) && ids.length > 0) {
          setSelectedContactKeys(ids.map(id => String(id)));
          setTargetAudience('custom');
          localStorage.removeItem('pendingQueueIds');
        }
      } catch (e) {}
    }
  }, []);

  const handleSaveSuccess = (newTemplate: Template) => {
    setTemplates(prev => {
      const updated = [newTemplate, ...prev];
      localStorage.setItem('my_email_templates', JSON.stringify(updated));
      setSelectedTemplateIds(updated.map(t => t.id));
      return updated;
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu taslağı silmek istediğinizden emin misiniz?")) {
      setTemplates(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('my_email_templates', JSON.stringify(updated));
        setSelectedTemplateIds(updated.map(t => t.id));
        return updated;
      });
    }
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds(prev => prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]);
  };

  const toggleSelectAllTemplates = () => {
    setSelectedTemplateIds(selectedTemplateIds.length === templates.length ? [] : templates.map(t => t.id));
  };

  const filteredContacts = contacts.filter((c: any) => {
    const term = contactSearch.toLowerCase();
    const fullName = `${c.first_name || c.name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  const handleStartCampaign = async () => {
    if (selectedTemplateIds.length === 0) {
      alert("Lütfen en az 1 tane taslak seçin!");
      return;
    }

    let initialTarget: any[] = [];
    if (targetAudience === 'all') {
      initialTarget = contacts;
    } else if (targetAudience === 'group') {
      // GRUP SEÇİMİNE GÖRE FİLTRELEME
      if (!selectedGroup) {
        alert("Lütfen bir grup seçin!");
        return;
      }
      initialTarget = contacts.filter((c: any) => (c.group_name || 'Genel') === selectedGroup);
    } else {
      initialTarget = contacts.filter((c: any) => {
        const cKeyId = String(c.id).toLowerCase();
        const cKeyEmail = String(c.email).toLowerCase();
        return selectedContactKeys.some(k => {
          const key = String(k).toLowerCase();
          return key === cKeyId || key === cKeyEmail;
        });
      });
    }

    if (initialTarget.length === 0) {
      alert("Gönderim yapılacak alıcı seçilmedi veya eşleşmedi!");
      return;
    }

    // MÜKERRER KONTROLÜ
    const sentHistory: string[] = JSON.parse(localStorage.getItem('my_sent_email_history') || '[]');
    const targetContacts = initialTarget.filter(
      c => !sentHistory.includes((c.email || '').toLowerCase())
    );

    if (targetContacts.length === 0) {
      alert("⚠️ Seçilen kişilerin tamamına daha önce e-posta gönderildiği için gönderim pas geçildi. Sistem zaten tamamlanmış.");
      return;
    }

    const selectedTemplates = templates.filter(t => selectedTemplateIds.includes(t.id));
    const campaignId = Date.now().toString();

    const newCampaign = {
      id: campaignId,
      name: `Kampanya - ${selectedTemplates.length} Taslak`,
      template_count: selectedTemplates.length,
      total_recipients: targetContacts.length,
      sent_count: 0,
      status: scheduleType === 'now' ? 'sending' : 'scheduled',
      schedule_type: scheduleType,
      scheduled_at: scheduleType === 'now' ? 'Hemen Başlatıldı' : `${scheduledDate} ${scheduledTime}`,
      created_at: new Date().toLocaleDateString('tr-TR'),
      sent_recipients: [],
      pending_recipients: targetContacts.map(c => ({ 
        email: c.email, 
        name: `${c.first_name || c.name || 'Değerli Üyemiz'}` 
      })),
      selected_templates: selectedTemplates
    };

    const existing = JSON.parse(localStorage.getItem('my_email_campaigns') || '[]');
    localStorage.setItem('my_email_campaigns', JSON.stringify([newCampaign, ...existing]));

    localStorage.setItem('my_mailer_last_send', '0');

    alert("🚀 Kampanya Emri Verildi!\n\nSistem arka planda 30 saniyede bir gönderim yapacaktır. Artık diğer sayfalarda özgürce gezinebilirsiniz!");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">E-Posta Yönetimi</h1>
            <p className="text-slate-500 mt-1">Spam Korumalı (30s) & Planlanabilir Gönderim</p>
          </div>

          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex gap-1">
            <button 
              onClick={() => setActiveTab('templates')} 
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📑 Taslaklarım ({templates.length})
            </button>
            <button 
              onClick={() => setActiveTab('campaign')} 
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'campaign' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚀 Kampanya Başlat
            </button>
          </div>
        </div>

        {activeTab === 'templates' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Kayıtlı Şablonlar</h2>
              <button 
                onClick={() => setIsUploadModalOpen(true)} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
              >
                + Yeni Taslak Yükle
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Henüz Taslak Yok</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md">Taslak</span>
                      <h3 className="text-lg font-bold text-slate-800 mt-3">{template.subject}</h3>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between">
                      <button onClick={() => setPreviewTemplate(template)} className="text-xs font-semibold text-indigo-600 hover:underline">Önizle</button>
                      <button onClick={() => handleDelete(template.id)} className="text-xs font-semibold text-rose-500 hover:underline">Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaign' && (
          <div className="space-y-8">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">1. Kullanılacak Taslaklar (Çoklu Seçim)</h3>
                <button onClick={toggleSelectAllTemplates} className="text-xs font-bold text-indigo-600 hover:underline">Tümünü Seç</button>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-slate-400">Kayıtlı taslak bulunamadı.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map(t => {
                    const isSelected = selectedTemplateIds.includes(t.id);
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTemplateSelection(t.id)} 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-800">{t.subject}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800">2. Hedef Kitle</h3>
                
                <div className="space-y-3">
                  {/* SEÇENEK 1: TÜM ÜYELER */}
                  <label className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    targetAudience === 'all' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="targetAudience" 
                        checked={targetAudience === 'all'} 
                        onChange={() => setTargetAudience('all')} 
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Tüm Üyeler</p>
                        <p className="text-xs text-slate-500">Tüm alıcılara dönüşümlü olarak gönderilir.</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md">{contacts.length} Kişi</span>
                  </label>

                  {/* SEÇENEK 2: GRUP / LİSTE SEÇİMİ (YENİ EKLENEN KISIM) */}
                  <label className={`p-4 rounded-xl border-2 flex flex-col cursor-pointer transition-all ${
                    targetAudience === 'group' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="targetAudience" 
                          checked={targetAudience === 'group'} 
                          onChange={() => setTargetAudience('group')} 
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">Grup / Liste Seçimi</p>
                          <p className="text-xs text-slate-500">Kayıtlı Excel listelerinize veya gruplara özel gönderim yapın.</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md">
                        {selectedGroup ? `${contacts.filter((c: any) => (c.group_name || 'Genel') === selectedGroup).length} Kişi` : 'Seçiniz'}
                      </span>
                    </div>

                    {targetAudience === 'group' && (
                      <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Hedef Grubu Seçin:</label>
                        <select
                          value={selectedGroup}
                          onChange={(e) => setSelectedGroup(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        >
                          {existingGroups.map((gName) => {
                            const count = contacts.filter((c: any) => (c.group_name || 'Genel') === gName).length;
                            return (
                              <option key={gName} value={gName}>
                                {gName} ({count} Kişi)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </label>

                  {/* SEÇENEK 3: ÖZEL KİŞİ SEÇİMİ */}
                  <label className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    targetAudience === 'custom' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="targetAudience" 
                        checked={targetAudience === 'custom'} 
                        onChange={() => setTargetAudience('custom')} 
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Özel Kişi Seçimi</p>
                        <p className="text-xs text-slate-500">Listedeki kişilerden seçerek gönderin.</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md">{selectedContactKeys.length} Seçildi</span>
                  </label>
                </div>

                {targetAudience === 'custom' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3">
                      <input 
                        type="text" 
                        placeholder="İsim, e-posta veya tel ara..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedContactKeys.length === filteredContacts.length) {
                            setSelectedContactKeys([]);
                          } else {
                            setSelectedContactKeys(filteredContacts.map((c: any) => String(c.id || c.email)));
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 whitespace-nowrap px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        {selectedContactKeys.length === filteredContacts.length ? 'Temizle' : 'Tümünü Seç'}
                      </button>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {filteredContacts.length === 0 ? (
                        <p className="text-xs text-slate-400 p-3 text-center">Kayıtlı kişi bulunamadı.</p>
                      ) : (
                        filteredContacts.map((c: any) => {
                          const cKeyId = String(c.id).toLowerCase();
                          const cKeyEmail = String(c.email).toLowerCase();
                          const isChecked = selectedContactKeys.some(k => {
                            const key = String(k).toLowerCase();
                            return key === cKeyId || key === cKeyEmail;
                          });
                          return (
                            <label 
                              key={c.id} 
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer bg-white transition-all ${
                                isChecked ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedContactKeys(prev => 
                                      isChecked
                                        ? prev.filter(k => {
                                            const lowerK = String(k).toLowerCase();
                                            return lowerK !== cKeyId && lowerK !== cKeyEmail;
                                          }) 
                                        : [...prev, String(c.id)]
                                    );
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="truncate">
                                  <span className="font-bold text-slate-800">{c.first_name || c.name || 'İsimsiz'} {c.last_name || ''}</span>
                                  <span className="text-slate-400 ml-2 font-mono">({c.email})</span>
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-800">3. Zamanlama</h3>
                <div className="space-y-3">
                  <label className={`p-3 rounded-xl border-2 block cursor-pointer transition-all ${
                    scheduleType === 'now' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                  }`}>
                    <input type="radio" name="schedule" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} className="mr-2" />
                    <span className="text-sm font-bold text-slate-800">Hemen Gönder (30s Aralıklı)</span>
                  </label>
                  <label className={`p-3 rounded-xl border-2 block cursor-pointer transition-all ${
                    scheduleType === 'scheduled' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                  }`}>
                    <input type="radio" name="schedule" checked={scheduleType === 'scheduled'} onChange={() => setScheduleType('scheduled')} className="mr-2" />
                    <span className="text-sm font-bold text-slate-800">Belirli Saat İçin Planla (09:00 - 16:30 Mesai Korumalı)</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="text-lg font-bold">Kampanya Özeti</h4>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedTemplateIds.length} Taslak | {
                    targetAudience === 'all' 
                      ? contacts.length 
                      : (targetAudience === 'group' 
                          ? contacts.filter((c: any) => (c.group_name || 'Genel') === selectedGroup).length 
                          : selectedContactKeys.length)
                  } Alıcı
                </p>
              </div>
              <button 
                onClick={handleStartCampaign} 
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg"
              >
                🚀 Kampanyayı Arka Planda Başlat
              </button>
            </div>

          </div>
        )}

      </div>

      {isUploadModalOpen && <TaslakYuklemeModali onClose={() => setIsUploadModalOpen(false)} onSaveSuccess={handleSaveSuccess} />}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] p-6 overflow-y-auto relative shadow-2xl">
            <button onClick={() => setPreviewTemplate(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">{previewTemplate.subject}</h3>
            <div dangerouslySetInnerHTML={{ __html: previewTemplate.html_content }} />
          </div>
        </div>
      )}
    </div>
  );
}