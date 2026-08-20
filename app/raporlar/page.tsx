"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface DailyData {
  dateKey: string;
  displayDate: string;
  sent: number;
  opens: number;
}

export default function RaporlarPage() {
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [dailyDataList, setDailyDataList] = useState<DailyData[]>([]);
  
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    totalRecipients: 0,
    openRate: "0.0",
    openCount: 0,
    bounceRate: "0.0",
    bounceCount: 0,
    deliveryRate: "100.0",
    totalMembers: 0,
    newMembers30Days: 0,
  });

  // TÜM TARİH FORMATLARINI (17.08.2026 -> 2026-08-17) DÖNÜŞTÜREN YARDIMCI FONKSİYON
  const normalizeDateKey = (dateStr: any): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // TR Formatı ise (17.08.2026 veya 17/08/2026)
    if (typeof dateStr === 'string' && (dateStr.includes('.') || dateStr.includes('/'))) {
      const parts = dateStr.split(/[./]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    }

    // ISO Formatı ise (2026-08-17T...)
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      return dateStr.split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  const calculateReports = async () => {
    try {
      const days = parseInt(timeRange);
      
      const campsData = localStorage.getItem('my_email_campaigns');
      const campaigns = campsData ? JSON.parse(campsData) : [];

      const membersData = localStorage.getItem('my_members');
      const members = membersData ? JSON.parse(membersData) : [];

      // 1. Günlük Sözlük Yapısı Oluştur
      const dailyMap: Record<string, DailyData> = {};
      const datesArray: string[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        
        const key = d.toISOString().split('T')[0]; // "2026-08-17"
        const display = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }); // "17 Ağu"
        
        dailyMap[key] = {
          dateKey: key,
          displayDate: display,
          sent: 0,
          opens: 0
        };
        datesArray.push(key);
      }

      let totalSentMails = 0;
      let totalFailedMails = 0;
      let totalTargetRecipients = 0;

      // 2. Kampanya Verilerini Tara ve Tarihleri Eşleştir
      campaigns.forEach((camp: any) => {
        const sentList = camp.sent_recipients || [];
        const failedList = camp.failed_recipients || [];
        const pendingList = camp.pending_recipients || [];

        totalSentMails += sentList.length;
        totalFailedMails += failedList.length;
        totalTargetRecipients += (sentList.length + failedList.length + pendingList.length);

        // Kampanyanın genel tarihi
        const campFormattedDate = normalizeDateKey(camp.created_at || camp.created_date);

        sentList.forEach((rec: any) => {
          // Önce alıcının tarihine, yoksa kampanya tarihine bak
          const recDate = rec.date ? normalizeDateKey(rec.date) : campFormattedDate;

          if (dailyMap[recDate]) {
            dailyMap[recDate].sent += 1;
          } else {
            // Eğer tarih mevcut filtre aralığındaysa doğrudan eşle
            const matchedKey = Object.keys(dailyMap).find(k => k === recDate);
            if (matchedKey) dailyMap[matchedKey].sent += 1;
          }
        });
      });

      // 3. Supabase Okunma (Open) Loglarını Günlere Dağıt
      let uniqueOpensCount = 0;

      if (supabase) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: trackLogs } = await supabase
          .from('tracking_logs')
          .select('*')
          .eq('event_type', 'open')
          .gte('created_at', startDate.toISOString());

        if (trackLogs) {
          const openedEmails = new Set();

          trackLogs.forEach((log: any) => {
            openedEmails.add(log.email.toLowerCase());
            const openDate = normalizeDateKey(log.created_at);
            if (dailyMap[openDate]) {
              dailyMap[openDate].opens += 1;
            }
          });

          uniqueOpensCount = openedEmails.size;
        }
      }

      const sortedDailyList = datesArray.map(dateKey => dailyMap[dateKey]);
      setDailyDataList(sortedDailyList);

      const openRateCalc = totalSentMails > 0 ? ((uniqueOpensCount / totalSentMails) * 100).toFixed(1) : "0.0";
      const totalAttempts = totalSentMails + totalFailedMails;
      const bounceRateCalc = totalAttempts > 0 ? ((totalFailedMails / totalAttempts) * 100).toFixed(1) : "0.0";
      const deliveryRateCalc = totalAttempts > 0 ? ((totalSentMails / totalAttempts) * 100).toFixed(1) : "100.0";

      setStats({
        totalCampaigns: campaigns.length,
        totalSent: totalSentMails,
        totalRecipients: totalTargetRecipients,
        openRate: openRateCalc,
        openCount: uniqueOpensCount,
        bounceRate: bounceRateCalc,
        bounceCount: totalFailedMails,
        deliveryRate: deliveryRateCalc,
        totalMembers: members.length,
        newMembers30Days: members.length,
      });

    } catch (error) {
      console.error("Raporlar hesaplanırken hata oluştu:", error);
    }
  };

  useEffect(() => {
    calculateReports();
    const interval = setInterval(calculateReports, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const maxSentInPeriod = Math.max(...dailyDataList.map(d => d.sent), 1);

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* BAŞLIK & ZAMAN FİLTRESİ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Raporlar</h1>
            <p className="text-slate-500 text-sm mt-1">
              {stats.totalCampaigns} kampanyanın detaylı günlük istatistikleri
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex items-center gap-1 self-start sm:self-auto">
            {(['7', '30', '90'] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === days ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} gün
              </button>
            ))}
          </div>
        </div>

        {/* METRİK ÖZET KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500">Toplam Gönderilen</span>
            <div className="text-3xl font-black text-slate-900">{stats.totalSent}</div>
            <div className="text-xs text-slate-400">{stats.totalCampaigns} kampanya · {stats.totalRecipients} hedef alıcı</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500">Açılma Oranı</span>
            <div className="text-3xl font-black text-emerald-500">%{stats.openRate}</div>
            <div className="text-xs text-slate-400">{stats.openCount} benzersiz okuma</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500">Teslim Oranı</span>
            <div className="text-3xl font-black text-indigo-600">%{stats.deliveryRate}</div>
            <div className="text-xs text-slate-400">Başarıyla ulaşan e-postalar</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500">Bounce (Başarısız)</span>
            <div className="text-3xl font-black text-rose-500">%{stats.bounceRate}</div>
            <div className="text-xs text-slate-400">{stats.bounceCount} ulaşılamayan mail</div>
          </div>
        </div>

        {/* GÜNLÜK GÖNDERİM GRAFİĞİ VE DETAYLI TARİH TABLOSU */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sol: Tarih Bazlı Görsel Grafik */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Günlük Gönderim Hacmi</h2>
              <span className="text-xs text-slate-400 font-medium">Son {timeRange} Günün Grafiği</span>
            </div>

            <div className="py-8">
              {stats.totalSent > 0 ? (
                <div className="w-full h-56 flex items-end justify-between gap-1 px-2 border-b border-slate-200 pb-2">
                  {dailyDataList.map((item, idx) => {
                    const heightPercent = item.sent > 0 ? Math.max((item.sent / maxSentInPeriod) * 100, 10) : 0;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Tooltip Hover */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-900 text-white text-[11px] font-mono px-2.5 py-1 rounded-md shadow-lg pointer-events-none transition-all z-20 whitespace-nowrap">
                          {item.displayDate}: {item.sent} Mail ({item.opens} Okunma)
                        </div>

                        {/* Bar Sütunu */}
                        <div 
                          className={`w-full rounded-t-md transition-all ${item.sent > 0 ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-100'}`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>

                        {/* X Ekseni Tarih Etiketi */}
                        <span className="text-[10px] text-slate-400 font-semibold mt-2 rotate-45 sm:rotate-0 origin-left">
                          {timeRange === '7' ? item.displayDate : (idx % Math.ceil(dailyDataList.length / 8) === 0 ? item.displayDate : '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                  Seçilen tarih aralığında henüz e-posta gönderimi bulunmuyor.
                </div>
              )}
            </div>

            {/* Tarih Detay Tablosu (En Son Günler Üstte) */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Tarih Bazlı Günlük Döküm</h3>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {[...dailyDataList].reverse().filter(d => d.sent > 0).length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 italic text-center">Gönderim yapılan tarih kaydı yok.</p>
                ) : (
                  [...dailyDataList].reverse().filter(d => d.sent > 0).map((item, idx) => (
                    <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span className="font-bold text-slate-800">{item.dateKey} ({item.displayDate})</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-600 font-medium">
                          Gönderilen: <strong className="text-slate-900">{item.sent}</strong>
                        </span>
                        <span className="text-emerald-600 font-medium">
                          Okunma: <strong>{item.opens}</strong>
                        </span>
                        <span className="text-slate-400 font-mono">
                          Oran: %{item.sent > 0 ? ((item.opens / item.sent) * 100).toFixed(0) : 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Sağ: Genel Bakış */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Genel Bakış
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Teslim Oranı</span>
                <span className="font-bold text-slate-900">%{stats.deliveryRate}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Açılma Oranı</span>
                <span className="font-bold text-emerald-600">%{stats.openRate}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Bounce Oranı</span>
                <span className="font-bold text-slate-900">%{stats.bounceRate}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Şikayet Oranı</span>
                <span className="font-bold text-slate-900">%0.0</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Abonelik İptal</span>
                <span className="font-bold text-slate-900">%0.0</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Toplam Kayıtlı Üye</span>
                <span className="font-bold text-slate-900">{stats.totalMembers}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Son {timeRange} günde eklenen</span>
                <span className="font-bold text-emerald-600">+{stats.newMembers30Days}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}