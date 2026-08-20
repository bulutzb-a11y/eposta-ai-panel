"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface SentMailLog {
  id: string;
  campaignId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  time: string;
  status: 'delivered' | 'failed';
  campaignName: string;
}

interface ReceivedMailLog {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  date: string;
  content: string;
}

interface TrackingLog {
  id: string;
  event_type: 'open' | 'click';
  email: string;
  campaign_id: string;
  target_url: string | null;
  created_at: string;
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [sentLogs, setSentLogs] = useState<SentMailLog[]>([]);
  const [receivedLogs, setReceivedLogs] = useState<ReceivedMailLog[]>([]);
  const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMail, setSelectedMail] = useState<any | null>(null);

  const loadSentMails = () => {
    try {
      const campaignsData = localStorage.getItem('my_email_campaigns');
      if (!campaignsData) return;
      const campaigns = JSON.parse(campaignsData);
      const allLogs: SentMailLog[] = [];

      campaigns.forEach((camp: any) => {
        if (camp.sent_recipients && Array.isArray(camp.sent_recipients)) {
          camp.sent_recipients.forEach((rec: any, index: number) => {
            const template = camp.selected_templates ? camp.selected_templates[index % camp.selected_templates.length] : null;
            allLogs.push({
              id: `${camp.id}-${index}`,
              campaignId: camp.id,
              recipientName: rec.name || 'Değerli Üyemiz',
              recipientEmail: rec.email,
              subject: template ? template.subject : 'Cumhuriyet İçin Koş Bilgilendirme',
              time: rec.time || new Date().toLocaleTimeString('tr-TR'),
              status: 'delivered',
              campaignName: camp.name || 'Genel Gönderim'
            });
          });
        }
      });
      setSentLogs(allLogs.reverse());
    } catch (e) {}
  };

  const fetchTrackingData = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('tracking_logs').select('*').order('created_at', { ascending: false });
      if (data) setTrackingLogs(data);
    } catch (e) {}
  };

  const fetchIncomingMails = async () => {
    setLoadingReceived(true);
    try {
      const res = await fetch('/api/fetch-emails');
      const data = await res.json();
      if (data.success && Array.isArray(data.emails)) setReceivedLogs(data.emails);
    } catch (err) {} finally {
      setLoadingReceived(false);
    }
  };

  useEffect(() => {
    loadSentMails();
    fetchTrackingData();
    fetchIncomingMails();

    const interval = setInterval(() => {
      loadSentMails();
      fetchTrackingData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const filteredSentLogs = sentLogs.filter(mail => 
    mail.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mail.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mail.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivedLogs = receivedLogs.filter(mail =>
    mail.senderEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mail.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mail.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">E-Posta Kutusu & Takip</h1>
            <p className="text-slate-500 mt-1">Giden e-postaların okunma istatistiklerini ve gelen kutunuzu izleyin.</p>
          </div>

          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex gap-1">
            <button onClick={() => setActiveTab('sent')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              📤 Gönderilenler ({sentLogs.length})
            </button>
            <button onClick={() => { setActiveTab('received'); fetchIncomingMails(); }} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'received' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              📥 Gelen Kutusu ({receivedLogs.length})
            </button>
          </div>
        </div>

        {activeTab === 'sent' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <input type="text" placeholder="Alıcı ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"/>
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Canlı Takip Devrede ⚡</span>
            </div>

            {filteredSentLogs.length === 0 ? (
               <div className="py-12 text-center text-slate-400">
                  <p className="text-base font-semibold">Henüz gönderilmiş bir e-posta kaydı bulunamadı.</p>
               </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSentLogs.map((mail) => {
                  const mailEvents = trackingLogs.filter(t => t.email === mail.recipientEmail && t.campaign_id === mail.campaignId);
                  const opens = mailEvents.filter(t => t.event_type === 'open');
                  const clicks = mailEvents.filter(t => t.event_type === 'click');

                  return (
                    <div key={mail.id} onClick={() => setSelectedMail({ ...mail, type: 'sent', opens, clicks })} className="py-4 px-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${opens.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {opens.length > 0 ? '👁️' : '✓'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{mail.recipientName}</span>
                            <span className="text-xs text-slate-400 font-mono">&lt;{mail.recipientEmail}&gt;</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">{mail.subject}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right justify-between md:justify-end flex-wrap">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">✅ İletildi</span>
                        {opens.length > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">👁️ {opens.length} Okuma</span>}
                        {clicks.length > 0 && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">🖱️ {clicks.length} Tıklama</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <input type="text" placeholder="Gönderen veya konu ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"/>
              <button onClick={fetchIncomingMails} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">🔄 Yenile</button>
            </div>
            {loadingReceived ? (
               <div className="py-12 text-center text-slate-400"><p className="text-base font-semibold">IMAP Sunucusuna Bağlanılıyor...</p></div>
            ) : filteredReceivedLogs.length === 0 ? (
               <div className="py-12 text-center text-slate-400"><p className="text-base font-semibold">Gelen Kutunuzda e-posta bulunamadı.</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReceivedLogs.map((mail) => (
                  <div key={mail.id} onClick={() => setSelectedMail({ ...mail, type: 'received' })} className="py-4 px-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">📩</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{mail.senderName}</span>
                          <span className="text-xs text-slate-400 font-mono">&lt;{mail.senderEmail}&gt;</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{mail.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{mail.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAY MODALI */}
      {selectedMail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedMail(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            
            {selectedMail.type === 'sent' ? (
              <>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md inline-block">Gönderim Detayı & Takip</span>
                <h3 className="text-xl font-bold text-slate-800">{selectedMail.subject}</h3>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                    <p className="font-bold text-blue-800 text-sm">👁️ Açılma Geçmişi</p>
                    {selectedMail.opens?.length === 0 ? (
                      <p className="text-xs text-slate-500">Henüz okunmadı.</p>
                    ) : (
                      <ul className="text-xs text-slate-600 space-y-1">
                        {selectedMail.opens?.map((o: any) => (<li key={o.id}>• {new Date(o.created_at).toLocaleString('tr-TR')}</li>))}
                      </ul>
                    )}
                  </div>
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                    <p className="font-bold text-purple-800 text-sm">🖱️ Tıklanan Linkler</p>
                    {selectedMail.clicks?.length === 0 ? (
                      <p className="text-xs text-slate-500">Hiçbir linke tıklanmadı.</p>
                    ) : (
                      <ul className="text-xs text-slate-600 space-y-2">
                        {selectedMail.clicks?.map((c: any) => (
                          <li key={c.id} className="break-all">
                            <span className="block text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('tr-TR')}</span>
                            <a href={c.target_url} target="_blank" className="text-purple-600 hover:underline">{c.target_url}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md inline-block">Gelen E-Posta</span>
                <h3 className="text-xl font-bold text-slate-800">{selectedMail.subject}</h3>
                <div className="border-t border-slate-100 py-3 text-xs text-slate-600 space-y-1">
                  <p><strong className="text-slate-800">Gönderen:</strong> {selectedMail.senderName} ({selectedMail.senderEmail})</p>
                  <p><strong className="text-slate-800">Tarih:</strong> {selectedMail.date}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                  {selectedMail.content}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}