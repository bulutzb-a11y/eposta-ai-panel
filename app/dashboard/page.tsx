"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface SentRecipient {
  email: string;
  name: string;
  time: string;
}

interface Campaign {
  id: string;
  name: string;
  template_count: number;
  total_recipients: number;
  sent_count: number;
  status: 'scheduled' | 'sending' | 'completed' | 'stopped' | 'paused_time';
  scheduled_at: string;
  created_at: string;
  sent_recipients?: SentRecipient[];
}

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalSentMails, setTotalSentMails] = useState(0);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [isWhatsappConnected, setIsWhatsappConnected] = useState(false);

  useEffect(() => {
    // 1000 LİMİTİNİ AŞAN SUPABASE SORGUSU
    const fetchAllMembersFromDB = async () => {
      if (!supabase) return;
      let allMembers: any[] = [];
      let start = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .range(start, start + step - 1);

        if (data && data.length > 0) {
          allMembers = [...allMembers, ...data];
          start += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allMembers.length > 0) {
        setTotalMembers(allMembers.length);
        localStorage.setItem('my_email_members', JSON.stringify(allMembers));
      }
    };

    fetchAllMembersFromDB();

    const fetchDashboardData = () => {
      const campData = localStorage.getItem('my_email_campaigns');
      let parsedCamps: Campaign[] = [];
      if (campData) {
        try {
          parsedCamps = JSON.parse(campData);
          setCampaigns(parsedCamps);
        } catch (e) {}
      }

      const sentCount = parsedCamps.reduce((sum, camp) => sum + (camp.sent_count || 0), 0);
      setTotalSentMails(sentCount);

      // Veritabanı bitene kadar local'den oku
      const membersData = localStorage.getItem('my_email_members');
      if (membersData) {
        try {
          const members = JSON.parse(membersData);
          setTotalMembers(members.length);
        } catch (e) {}
      }

      const mailConn = localStorage.getItem('my_email_connection');
      if (mailConn) setIsMailConnected(JSON.parse(mailConn).isConnected);
      
      const wpConn = localStorage.getItem('my_whatsapp_connection');
      if (wpConn) setIsWhatsappConnected(JSON.parse(wpConn).isConnected);
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStopCampaign = (id: string) => {
    if (confirm("Bu kampanyayı durdurmak istediğinize emin misiniz?")) {
      const current: Campaign[] = JSON.parse(localStorage.getItem('my_email_campaigns') || '[]');
      const updated = current.map(c => c.id === id ? { ...c, status: 'stopped' as const } : c);
      localStorage.setItem('my_email_campaigns', JSON.stringify(updated));
      setCampaigns(updated);
    }
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Bu kampanyayı geçmişten tamamen silmek istediğinize emin misiniz?")) {
      const current: Campaign[] = JSON.parse(localStorage.getItem('my_email_campaigns') || '[]');
      const updated = current.filter(c => c.id !== id);
      localStorage.setItem('my_email_campaigns', JSON.stringify(updated));
      setCampaigns(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gösterge Paneli</h1>
            <p className="text-slate-500 mt-1 text-sm">Canlı sistem verileri ve kampanya takibi.</p>
          </div>
          <Link href="/kampanyalar" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center gap-2">
            🚀 Yeni Kampanya Başlat
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-semibold text-slate-500">Sistemdeki Üyeler</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{totalMembers}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-semibold text-slate-500">İletilen Başarılı Mail</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{totalSentMails}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
            <p className="text-sm font-semibold text-slate-500">E-Posta Sunucusu</p>
            {isMailConnected ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg w-fit flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Bağlı & Aktif</span>
            ) : (
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-lg w-fit flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Bağlı Değil</span>
            )}
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
            <p className="text-sm font-semibold text-slate-500">WhatsApp Sunucusu</p>
            {isWhatsappConnected ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg w-fit flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Bağlı & Aktif</span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg w-fit flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Bağlı Değil</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Aktif & Geçmiş Kampanyalar</h2>
            <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Canlı Senkronizasyon
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-sm">Henüz başlatılmış bir kampanya yok.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => {
                const percent = campaign.total_recipients > 0 
                  ? Math.min(100, Math.round((campaign.sent_count / campaign.total_recipients) * 100))
                  : 0;

                const recipientList = Array.isArray(campaign.sent_recipients) ? campaign.sent_recipients : [];

                return (
                  <div key={campaign.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-900 text-lg">{campaign.name}</h3>
                          
                          {campaign.status === 'sending' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                              🚀 Gönderiliyor...
                            </span>
                          )}
                          {campaign.status === 'paused_time' && (
                            <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                              ⏳ Mesai Dışı (Uyku Modu)
                            </span>
                          )}
                          {campaign.status === 'completed' && (
                            <span className="bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1 rounded-full">
                              ✅ Tamamlandı
                            </span>
                          )}
                          {campaign.status === 'stopped' && (
                            <span className="bg-rose-100 text-rose-700 font-bold text-xs px-3 py-1 rounded-full">
                              ⏹️ Durduruldu
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          Tarih: <strong className="text-slate-700">{campaign.created_at}</strong> | Hedef: <strong className="text-slate-700">{campaign.total_recipients} Kişi</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left md:text-right">
                          <span className="text-2xl font-black text-indigo-600">%{percent}</span>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {campaign.sent_count} / {campaign.total_recipients} İletildi
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {(campaign.status === 'sending' || campaign.status === 'paused_time') && (
                            <button
                              onClick={() => handleStopCampaign(campaign.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                            >
                              ⏹️ Durdur
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          campaign.status === 'stopped' ? 'bg-rose-500' : 
                          campaign.status === 'paused_time' ? 'bg-amber-400' :
                          'bg-gradient-to-r from-indigo-500 to-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {expandedCampaignId === campaign.id ? '▲ Gönderilen Kişileri Gizle' : '▼ Gönderilen Kişileri Gör'} ({recipientList.length})
                      </button>

                      {expandedCampaignId === campaign.id && (
                        <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                          {recipientList.length === 0 ? (
                            <p className="text-xs text-slate-400">Henüz iletilen kişi yok.</p>
                          ) : (
                            recipientList.map((r, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                                <span className="font-semibold text-slate-800">{r.name} ({r.email})</span>
                                <span className="text-[10px] text-slate-400 font-mono">{r.time}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}