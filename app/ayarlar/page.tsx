'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AyarlarPage() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState({
    host: '',
    port: '587',
    username: '',
    password: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('smtp_settings').select('*').maybeSingle();
    if (data && data.username) {
      setSettings({
        host: data.host || '',
        port: data.port || '587',
        username: data.username || '',
        password: data.password || ''
      });
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    if (!settings.host || !settings.username || !settings.password) {
      return alert('Lütfen E-Posta Sunucu Adresi, E-Posta Adresi ve Şifre alanlarını doldurun.');
    }

    setLoading(true);
    
    // Veritabanına SADECE var olan sütunları gönderiyoruz (Schema hatasını %100 engeller)
    const payload = {
      host: settings.host.trim(),
      port: settings.port.trim(),
      username: settings.username.trim(),
      password: settings.password.trim()
    };

    const { data: existing } = await supabase.from('smtp_settings').select('id').maybeSingle();

    let error;
    if (existing) {
      const res = await supabase.from('smtp_settings').update(payload).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('smtp_settings').insert([payload]);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      alert(`Kayıt Hatası: ${error.message}`);
    } else {
      alert('✅ SMTP Ayarları kaydedildi ve hesap bağlandı!');
      setIsConnected(true);
      window.dispatchEvent(new Event('smtp_status_changed'));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('E-posta hesabının bağlantısını kesmek istediğinize emin misiniz? Otomatik gönderimler duracaktır.')) return;

    setLoading(true);
    // Veritabanındaki SMTP ayarını siliyoruz
    const { error } = await supabase.from('smtp_settings').delete().gte('created_at', '1970-01-01');

    setLoading(false);

    if (error) {
      // Eğer created_at yoksa id bazlı silmeyi dene
      const { data: existing } = await supabase.from('smtp_settings').select('id').maybeSingle();
      if (existing) {
        await supabase.from('smtp_settings').delete().eq('id', existing.id);
      }
    }

    setSettings({
      host: '',
      port: '587',
      username: '',
      password: ''
    });
    setIsConnected(false);
    alert('🔴 E-posta hesabının bağlantısı kesildi.');
    window.dispatchEvent(new Event('smtp_status_changed'));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">E-Posta Sunucu Ayarları</h1>
        <p className="text-sm text-gray-500 mt-1">Natro Kurumsal E-Posta hesabınızı sisteme bağlayın.</p>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">E-Posta Sunucu Adresi (SMTP Host)</label>
            <input 
              type="text" 
              value={settings.host} 
              onChange={e => setSettings({...settings, host: e.target.value})} 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="mail.kurumsaleposta.com" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">E-Posta Adresi (Kullanıcı Adı)</label>
              <input 
                type="text" 
                value={settings.username} 
                onChange={e => setSettings({...settings, username: e.target.value})} 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="info@sirket.com" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">E-Posta Şifresi</label>
              <input 
                type="password" 
                value={settings.password} 
                onChange={e => setSettings({...settings, password: e.target.value})} 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="••••••••••••" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Port</label>
            <input 
              type="text" 
              value={settings.port} 
              onChange={e => setSettings({...settings, port: e.target.value})} 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="587 veya 465" 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleSave} 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Hesabı Bağla ve Kaydet'}
          </button>

          {isConnected && (
            <button 
              onClick={handleDisconnect} 
              disabled={loading} 
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-medium py-3 px-6 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
            >
              Bağlantıyı Kes
            </button>
          )}
        </div>

        <div className="pt-2">
          {isConnected ? (
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ✓ E-posta hesabınız aktif! Gönderimler bu adres üzerinden yapılacaktır.
            </p>
          ) : (
            <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              ✕ E-posta hesabınız bağlı değil. Otomatik gönderimler yapılamaz.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}