"use client";

import React, { useState, useEffect } from 'react';

export default function HesapPage() {
  const [emailForm, setEmailForm] = useState({
    senderName: 'Cumhuriyet İçin Koş',
    email: 'tanitim@cumhuriyeticinkos.com',
    host: 'mail.kurumsaleposta.com',
    port: '465',
    password: 'I:Iz-3.Bi9Gk:u65',
    isConnected: true
  });

  // YENİ WHATSAPP API BAĞLANTI FORMU
  const [waForm, setWaForm] = useState({
    provider: 'ultramsg', // ultramsg, greenapi veya meta
    instanceId: '',
    token: '',
    isConnected: false
  });

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('my_email_connection');
    if (savedEmail) {
      try {
        const parsed = JSON.parse(savedEmail);
        setEmailForm(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }

    const savedWa = localStorage.getItem('my_whatsapp_connection');
    if (savedWa) {
      try {
        const parsed = JSON.parse(savedWa);
        setWaForm(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    
    setTimeout(() => {
      const updated = { ...emailForm, isConnected: true };
      setEmailForm(updated);
      localStorage.setItem('my_email_connection', JSON.stringify(updated));
      setSavingEmail(false);
      alert("✅ E-Posta sunucu bağlantısı başarıyla kaydedildi!");
    }, 500);
  };

  const handleDisconnectEmail = () => {
    if (confirm("E-Posta bağlantısını kesmek istediğinize emin misiniz?")) {
      const updated = { ...emailForm, isConnected: false };
      setEmailForm(updated);
      localStorage.setItem('my_email_connection', JSON.stringify(updated));
    }
  };

  // WHATSAPP KAYDETME
  const handleSaveWa = (e: React.FormEvent) => {
    e.preventDefault();

    if (!waForm.instanceId || !waForm.token) {
      alert("Lütfen Instance ID ve Token alanlarını doldurun!");
      return;
    }

    setSavingWa(true);
    setTimeout(() => {
      const updated = { ...waForm, isConnected: true };
      setWaForm(updated);
      localStorage.setItem('my_whatsapp_connection', JSON.stringify(updated));
      setSavingWa(false);
      alert("✅ WhatsApp API bağlantısı aktifleştirildi!");
    }, 600);
  };

  const handleDisconnectWa = () => {
    if (confirm("WhatsApp bağlantısını kesmek istediğinize emin misiniz?")) {
      const updated = { ...waForm, isConnected: false, instanceId: '', token: '' };
      setWaForm(updated);
      localStorage.setItem('my_whatsapp_connection', JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hesabı Bağla</h1>
          <p className="text-slate-500 mt-1">
            Gönderim yapacağınız e-posta sunucusunu ve WhatsApp otomasyon kanallarını buradan yönetin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* E-POSTA BAĞLANTISI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
                  ✉️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">E-Posta Bağlantısı</h2>
                  <p className="text-xs text-slate-500">SMTP & IMAP entegrasyonu</p>
                </div>
              </div>

              {emailForm.isConnected ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Bağlandı
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200">
                  Bağlı Değil
                </span>
              )}
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gönderen Adı</label>
                <input 
                  type="text" 
                  value={emailForm.senderName || ''} 
                  onChange={(e) => setEmailForm({ ...emailForm, senderName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-Posta Adresi</label>
                <input 
                  type="email" 
                  value={emailForm.email || ''} 
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Domain (Sunucu)</label>
                  <input 
                    type="text" 
                    value={emailForm.host || ''} 
                    onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Port</label>
                  <input 
                    type="text" 
                    value={emailForm.port || ''} 
                    onChange={(e) => setEmailForm({ ...emailForm, port: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Şifre / Uygulama Şifresi</label>
                <input 
                  type="password" 
                  value={emailForm.password || ''} 
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="submit" 
                  disabled={savingEmail}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm shadow-md disabled:opacity-50"
                >
                  {savingEmail ? 'Bağlanıyor...' : 'Bağlantıyı Kaydet'}
                </button>

                {emailForm.isConnected && (
                  <button 
                    type="button" 
                    onClick={handleDisconnectEmail}
                    className="px-4 py-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm"
                  >
                    Kapat
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* YENİ WHATSAPP BAĞLANTISI (API) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold">
                  💬
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">WhatsApp API</h2>
                  <p className="text-xs text-slate-500">Kesintisiz Otomasyon Bağlantısı</p>
                </div>
              </div>

              {waForm.isConnected ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Bağlandı
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  Hazır
                </span>
              )}
            </div>

            <form onSubmit={handleSaveWa} className="space-y-4">
              
              {/* SAĞLAYICI SEÇİMİ */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">API Sağlayıcısı</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWaForm({ ...waForm, provider: 'ultramsg' })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      waForm.provider === 'ultramsg' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🚀 UltraMsg API
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaForm({ ...waForm, provider: 'meta' })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      waForm.provider === 'meta' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Meta Cloud API
                  </button>
                </div>
              </div>

              {/* BİLGİ KUTUSU */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p>
                  <strong className="text-slate-800">Bilgi:</strong> Bağlantı kurmak için 
                  <a href="https://ultramsg.com/" target="_blank" className="text-emerald-600 hover:underline mx-1 font-bold">UltraMsg.com</a> 
                  üzerinden ücretsiz hesap oluşturup QR kodu oradaki panele taratın. Ardından size verilen <strong>Instance ID</strong> ve <strong>Token</strong> değerlerini aşağıya yapıştırın.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Instance ID (Oturum Kimliği)</label>
                <input 
                  type="text" 
                  value={waForm.instanceId || ''} 
                  onChange={(e) => setWaForm({ ...waForm, instanceId: e.target.value })}
                  placeholder="instance12345" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">API Token (Erişim Şifresi)</label>
                <input 
                  type="password" 
                  value={waForm.token || ''} 
                  onChange={(e) => setWaForm({ ...waForm, token: e.target.value })}
                  placeholder="token_xxxxxxxxxxxx" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="submit" 
                  disabled={savingWa}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {savingWa ? 'Bağlanıyor...' : 'WhatsApp API Bağlantısını Kur'}
                </button>

                {waForm.isConnected && (
                  <button 
                    type="button" 
                    onClick={handleDisconnectWa}
                    className="px-4 py-3 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm"
                  >
                    Kapat
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}