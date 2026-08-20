'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    sentEmails: 0,
    delivered: 0,
    opened: 0
  });
  
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, error: 0, total: 0 });

  useEffect(() => {
    fetchDashboardData();
    fetchQueueStats();

    const interval = setInterval(() => {
      fetchQueueStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    setStats(prev => ({
      ...prev,
      totalContacts: contactsCount || 0,
    }));
    
    if (campaigns) setRecentCampaigns(campaigns);
  };

  const fetchQueueStats = async () => {
    const { data } = await supabase.from('email_queue').select('status');
    
    if (data) {
      const pending = data.filter(d => d.status === 'Bekliyor').length;
      const sent = data.filter(d => d.status === 'Gönderildi').length;
      const error = data.filter(d => d.status === 'Hata').length;
      const total = pending + sent + error;

      setQueueStats({ pending, sent, error, total });

      setStats(prev => ({
        ...prev,
        sentEmails: sent,
        delivered: sent 
      }));
    }
  };

  const progressPercent = queueStats.total > 0 ? Math.round((queueStats.sent / queueStats.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 font-sans">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hoş Geldiniz! 👋</h1>
        <p className="text-sm text-gray-500 mt-1">E-posta pazarlama performansınızın anlık özeti aşağıdadır.</p>
      </header>

      {/* --- ROBOT CANLI İLERLEME PANELİ --- */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 relative z-10">
          <div>
            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              🤖 Arka Plan Gönderim Robotu
              {queueStats.pending > 0 && (
                <span className="flex h-3 w-3 relative ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
            </h2>
            <p className="text-sm text-blue-800 mt-1">
              {queueStats.total === 0 ? (
                'Şu an kuyrukta bekleyen veya devam eden bir gönderim bulunmuyor. Sistem hazır!'
              ) : (
                <>
                  Kuyruktaki <strong>{queueStats.total}</strong> kişiden <strong>{queueStats.sent}</strong> tanesine başarıyla gönderildi. 
                  {queueStats.pending > 0 ? ` ${queueStats.pending} kişi sırada bekliyor.` : ' Gönderim tamamlandı! 🎉'}
                  {queueStats.error > 0 && <span className="text-rose-600 ml-1">({queueStats.error} Hata)</span>}
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-blue-700">%{progressPercent}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-4 bg-blue-200/50 rounded-full overflow-hidden relative z-10">
          <div 
            className={`h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out relative ${queueStats.pending > 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600 background-animate' : ''}`}
            style={{ width: `${progressPercent}%` }}
          >
            {queueStats.pending > 0 && (
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
            )}
          </div>
        </div>
      </section>

      {/* --- İSTATİSTİK KARTLARI --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 block">Toplam Üye (Kişi)</span>
            <span className="text-4xl font-extrabold text-gray-900">{stats.totalContacts}</span>
          </div>
          <Link href="/uyeler" className="text-sm font-semibold text-blue-600 hover:text-blue-800 mt-4 inline-block transition-colors">
            Üyeleri Yönet →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 block">Gönderilen E-Posta</span>
            <span className="text-4xl font-extrabold text-gray-900">{stats.sentEmails}</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">Tetiklenen İşlemler</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2 block">İletilen (Başarılı)</span>
            <span className="text-4xl font-extrabold text-emerald-600">{stats.delivered}</span>
          </div>
          <p className="text-xs text-emerald-500/70 mt-4">Natro SMTP Onaylı</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-2 block">Açılan (Okunan)</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold text-purple-600">{stats.opened}</span>
              <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-100">
                %0 Oran
              </span>
            </div>
          </div>
          <p className="text-xs text-purple-400/70 mt-4">Piksel Takip Verisi</p>
        </div>
      </div>

      {/* --- SON EKLENEN KAMPANYALAR --- */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Son Eklenen Kampanyalar</h2>
          <Link href="/kampanyalar" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Tümünü Gör →
          </Link>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentCampaigns.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Henüz kampanya oluşturulmamış.</div>
          ) : (
            recentCampaigns.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div>
                  <h3 className="font-bold text-gray-900">{c.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{c.templates?.length || 0} Farklı AI Şablonu</p>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {c.status || 'Taslak'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}