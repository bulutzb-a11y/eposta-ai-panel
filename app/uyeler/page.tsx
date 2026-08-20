'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UyelerPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [groupName, setGroupName] = useState('');

  // Modallar ve Çift Kayıt Kontrolü için State'ler
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [pendingExcelContacts, setPendingExcelContacts] = useState<any[] | null>(null);
  const [duplicateContacts, setDuplicateContacts] = useState<any[]>([]);
  const [excelGroupName, setExcelGroupName] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchContacts();
    
    const interval = setInterval(() => {
      fetchContacts(false); 
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Verilerini Tüm Sayfaları Tarayarak Çekme
  const fetchContacts = async (showLoading = true) => {
    if (showLoading) setFetching(true);
    
    let allContacts: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          email_queue (
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Veri çekme hatası:", error);
        break;
      }

      if (data && data.length > 0) {
        allContacts = [...allContacts, ...data];
        if (data.length < pageSize) {
          keepFetching = false;
        } else {
          page++;
        }
      } else {
        keepFetching = false;
      }
    }

    setContacts(allContacts);
    if (showLoading) setFetching(false);
  };

  // Dinamik Grup Listesi ve Kişi Sayıları
  const groupCounts = contacts.reduce((acc: Record<string, number>, c: any) => {
    const g = c.group_name || 'Genel';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const existingGroups = Object.keys(groupCounts);

  // Arama ve Filtreleme
  const filteredContacts = contacts.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${c.first_name || c.name || ''} ${c.last_name || ''}`.toLowerCase();
    const emailVal = (c.email || '').toLowerCase();
    const phoneVal = (c.phone || '').toLowerCase();
    const groupVal = (c.group_name || 'Genel').toLowerCase();
    
    const matchesSearch = (
      fullName.includes(searchLower) ||
      emailVal.includes(searchLower) ||
      phoneVal.includes(searchLower) ||
      groupVal.includes(searchLower)
    );

    const matchesGroup = selectedGroupFilter === 'all' || (c.group_name || 'Genel') === selectedGroupFilter;

    return matchesSearch && matchesGroup;
  });

  const indexOfLastContact = currentPage * rowsPerPage;
  const indexOfFirstContact = indexOfLastContact - rowsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const visibleIds = currentContacts.map(c => c.id);
    if (e.target.checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Seçilen ${selectedIds.length} kişiyi silmek istediğinize emin misiniz?`)) return;
    
    setLoading(true);
    let hasError = false;
    let errorMessage = '';

    const chunkSize = 100;
    for (let i = 0; i < selectedIds.length; i += chunkSize) {
      const chunk = selectedIds.slice(i, i + chunkSize);
      const { error } = await supabase.from('contacts').delete().in('id', chunk);
      if (error) {
        hasError = true;
        errorMessage = error.message;
        break; 
      }
    }

    setLoading(false);

    if (hasError) {
      alert(`Silme Hatası: ${errorMessage}`);
    } else {
      setSelectedIds([]);
      setCurrentPage(1); 
      fetchContacts();
    }
  };

  // Komple Grup / Liste Silme
  const handleDeleteGroup = async (groupToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const count = groupCounts[groupToDelete] || 0;
    if (!confirm(`"${groupToDelete}" grubunu ve bu gruba ait ${count} kişiyi tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('group_name', groupToDelete);

    setLoading(false);

    if (error) {
      alert(`Grup Silme Hatası: ${error.message}`);
    } else {
      if (selectedGroupFilter === groupToDelete) {
        setSelectedGroupFilter('all');
      }
      fetchContacts();
    }
  };

  const handleBulkEmail = () => {
    localStorage.setItem('pendingQueueIds', JSON.stringify(selectedIds));
    window.location.href = '/kampanyalar';
  };

  const handleSingleEmail = (id: string) => {
    localStorage.setItem('pendingQueueIds', JSON.stringify([id]));
    window.location.href = '/kampanyalar';
  };

  const openWhatsApp = (phoneNumber: string, name: string) => {
    if (!phoneNumber) return alert('Bu kişinin telefon numarası kayıtlı değil.');
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Merhaba ${name}, `);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleManualSave = async () => {
    if (!firstName.trim() || !email.trim()) {
      return alert('Lütfen en azından İsim ve E-Posta alanlarını doldurun.');
    }
    
    setLoading(true);
    const { error } = await supabase
      .from('contacts')
      .upsert([{ 
        first_name: firstName.trim(), 
        last_name: lastName.trim(), 
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        group_name: groupName.trim() || 'Genel'
      }], { onConflict: 'email' });

    if (error) {
      alert(`Kayıt Hatası: ${error.message}`);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setGroupName('');
      fetchContacts();
    }
    setLoading(false);
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;
    if (!editingContact.first_name?.trim() || !editingContact.email?.trim()) {
      return alert('Lütfen en azından İsim ve E-Posta alanlarını doldurun.');
    }

    setLoading(true);
    const { error } = await supabase
      .from('contacts')
      .update({
        first_name: editingContact.first_name.trim(),
        last_name: editingContact.last_name?.trim() || '',
        name: `${editingContact.first_name.trim()} ${editingContact.last_name?.trim() || ''}`.trim(),
        email: editingContact.email.trim().toLowerCase(),
        phone: editingContact.phone?.trim() || null,
        group_name: editingContact.group_name?.trim() || 'Genel'
      })
      .eq('id', editingContact.id);

    setLoading(false);

    if (error) {
      alert(`Güncelleme Hatası: ${error.message}`);
    } else {
      setEditingContact(null);
      fetchContacts(false);
    }
  };

  // EXCEL YÜKLEME VE İSİM/SOYİSİM/MAİL MÜKERRER KONTROL MOTORU
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      let uniqueContacts = new Map<string, any>();
      
      data.forEach(row => {
        if (row.length > 0) {
          const emailCell = row.find(cell => typeof cell === 'string' && cell.includes('@'));
          if (emailCell) {
            const cleanEmail = String(emailCell).trim().toLowerCase();
            const otherCells = row.filter(cell => cell !== emailCell && cell != null);
            const fName = otherCells[0] ? String(otherCells[0]).trim() : 'Değerli';
            const lName = otherCells[1] ? String(otherCells[1]).trim() : 'Müşterimiz';
            
            const phoneCell = otherCells.find(cell => String(cell).replace(/\D/g, '').length >= 10);
            const cleanPhone = phoneCell ? String(phoneCell).trim() : null;

            uniqueContacts.set(cleanEmail, { 
              first_name: fName,
              last_name: lName,
              name: `${fName} ${lName}`,
              email: cleanEmail,
              phone: cleanPhone
            });
          }
        }
      });

      const toInsert = Array.from(uniqueContacts.values());

      if (toInsert.length > 0) {
        // İÇERİDEKİ MEVCUT VERİLERLE ÇAPRAZ TARAMA (İsim + Soyisim VEYA E-Posta Eşleşmesi)
        const duplicates = toInsert.filter(newC => {
          return contacts.some(existingC => {
            const sameEmail = existingC.email && newC.email && existingC.email.toLowerCase() === newC.email.toLowerCase();
            const sameName = existingC.first_name && existingC.last_name && newC.first_name && newC.last_name &&
              existingC.first_name.trim().toLowerCase() === newC.first_name.trim().toLowerCase() &&
              existingC.last_name.trim().toLowerCase() === newC.last_name.trim().toLowerCase();
            
            return sameEmail || sameName;
          });
        });

        setDuplicateContacts(duplicates);
        setPendingExcelContacts(toInsert);
        const autoName = file.name.replace(/\.[^/.]+$/, '');
        setExcelGroupName(autoName || `Excel Yükleme ${new Date().toLocaleDateString('tr-TR')}`);
      } else {
        alert('Geçerli bir e-posta adresi bulunamadı.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; 
  };

  const confirmExcelUpload = async () => {
    if (!pendingExcelContacts) return;
    setLoading(true);

    const finalContacts = pendingExcelContacts.map(c => ({
      ...c,
      group_name: excelGroupName.trim() || 'Genel'
    }));

    const { error } = await supabase.from('contacts').upsert(finalContacts, { onConflict: 'email' });
    setLoading(false);
    
    if (error) {
      alert(`Hata: ${error.message}`);
    } else {
      fetchContacts();
      setSelectedGroupFilter(excelGroupName.trim() || 'Genel');
      setPendingExcelContacts(null);
      setDuplicateContacts([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kişiyi silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) alert(`Silme Hatası: ${error.message}`);
    else fetchContacts();
  };

  const getStatusBadge = (queueData: any[]) => {
    if (!queueData || queueData.length === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> İşlem Yok
        </span>
      );
    }

    const latest = queueData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    switch (latest.status) {
      case 'Gönderildi':
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Gönderildi
          </span>
        );
      case 'Bekliyor':
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Sırada
          </span>
        );
      case 'Hata':
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Hata
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 font-sans bg-slate-50/50 min-h-screen">
      
      {/* BAŞLIK VE HIZLI EYLEMLER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Üye Rehberi</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {fetching && contacts.length === 0 ? 'Veriler yükleniyor...' : `Sistemde toplam ${contacts.length} kayıtlı alıcı bulunuyor.`}
          </p>
        </div>

        <div>
          <input type="file" id="excel-upload" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          <label htmlFor="excel-upload" className="cursor-pointer bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel İle İçe Aktar
          </label>
        </div>
      </header>

      {/* 1. ÜST ALAN: YÜKLENEN LİSTELER VE GRUP KARTLARI */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Yüklenen Listeler & Gruplar</h2>
          <span className="text-xs text-slate-400 font-medium">{existingGroups.length} Farklı Liste</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* TÜM ÜYELER KARTI */}
          <button
            onClick={() => {
              setSelectedGroupFilter('all');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedGroupFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-sm'
            }`}
          >
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Tümü</div>
            <div className="text-2xl font-black mt-1">{contacts.length}</div>
            <div className="text-xs font-bold truncate mt-1">Tüm Kayıtlar</div>
          </button>

          {/* DİNAMİK GRUP KARTLARI */}
          {existingGroups.map((group) => {
            const isSelected = selectedGroupFilter === group;
            const count = groupCounts[group] || 0;

            return (
              <div
                key={group}
                onClick={() => {
                  setSelectedGroupFilter(group);
                  setCurrentPage(1);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    Liste
                  </span>

                  <button
                    onClick={(e) => handleDeleteGroup(group, e)}
                    className={`p-1 rounded-md transition-colors ${
                      isSelected
                        ? 'text-indigo-200 hover:text-white hover:bg-indigo-700'
                        : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`"${group}" Listesini ve Tüm Kişilerini Sil`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="text-2xl font-black mt-1">{count}</div>
                <div className="text-xs font-bold truncate mt-1" title={group}>{group}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* YENİ KİŞİ EKLEME FORMU */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Manuel Kişi Ekle</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="İsim *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Soyisim"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Telefon (0555...)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="E-Posta Adresi *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Grup / Liste Adı"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleManualSave}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-sm"
          >
            {loading ? 'Kaydediliyor...' : 'Kişiyi Kaydet'}
          </button>
        </div>
      </section>

      {/* SEÇİLİ ÖĞELER İÇİN TOPLU İŞLEM BARI */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <p className="text-xs font-bold text-indigo-900">
            {selectedIds.length} kişi seçildi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkEmail}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Seçilenlere E-Posta Gönder
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              {loading ? 'Siliniyor...' : 'Seçilenleri Sil'}
            </button>
          </div>
        </div>
      )}

      {/* ARAMA BARI VE TABLO ALANI */}
      <section className="bg-white border border-slate-200/80 rounded-2xl flex flex-col shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96 relative">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="İsim, soyisim, e-posta veya telefon içinde ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); 
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Aktif Liste:</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
              {selectedGroupFilter === 'all' ? 'Tüm Kayıtlar' : selectedGroupFilter} ({filteredContacts.length} Kişi)
            </span>
          </div>
        </div>

        {/* REHBER TABLOSU */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={currentContacts.length > 0 && currentContacts.every(c => selectedIds.includes(c.id))}
                  />
                </th>
                <th className="p-4">İsim</th>
                <th className="p-4">Soyisim</th>
                <th className="p-4">Telefon</th>
                <th className="p-4">E-Posta Adresi</th>
                <th className="p-4">Grup</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-right pr-6">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {currentContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    {fetching && contacts.length === 0 ? 'Yükleniyor...' : (searchTerm ? 'Aranan kriterlere uygun kişi bulunamadı.' : 'Bu listede kayıtlı üye bulunmuyor.')}
                  </td>
                </tr>
              ) : (
                currentContacts.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(c.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleSelect(c.id)}
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900">{c.first_name || c.name?.split(' ')[0] || '-'}</td>
                    <td className="p-4 font-bold text-slate-900 uppercase">{c.last_name || c.name?.split(' ').slice(1).join(' ') || '-'}</td>
                    <td className="p-4 text-slate-600 font-mono">{c.phone || '-'}</td>
                    <td className="p-4 text-slate-600 font-mono">{c.email}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {c.group_name || 'Genel'}
                      </span>
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(c.email_queue)}</td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {c.phone && (
                          <button
                            onClick={() => openWhatsApp(c.phone, c.first_name || 'Müşterimiz')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                            title="WhatsApp'tan Mesaj Gönder"
                          >
                            WA
                          </button>
                        )}
                        <button
                          onClick={() => handleSingleEmail(c.id)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          Gönder
                        </button>
                        <button
                          onClick={() => setEditingContact(c)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA */}
        {filteredContacts.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="font-medium">Sayfa Başına Kişi:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1); 
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="font-medium">
                Sayfa {currentPage} / {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* EXCEL GRUP İSMİ ONAY VE MÜKERRER KAYIT UYARI MODALI */}
      {pendingExcelContacts && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Excel Yüklemesini Tamamla</h3>
              <button
                onClick={() => {
                  setPendingExcelContacts(null);
                  setDuplicateContacts([]);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Excel dosyasından <strong>{pendingExcelContacts.length}</strong> kişi okundu.
              </p>

              {/* MÜKERRER KAYIT UYARI KUTUSU */}
              {duplicateContacts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {duplicateContacts.length} Mevcut Kayıt Tespiti
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Yüklenen dosyadaki <strong>{duplicateContacts.length}</strong> kişi (İsim-Soyisim veya E-Posta eşleşmesiyle) veritabanında zaten kayıtlı. Onay verdiğinizde bu kişilerin grup bilgisi güncellenecektir.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grup / Liste Adı</label>
                <input
                  type="text"
                  value={excelGroupName}
                  onChange={(e) => setExcelGroupName(e.target.value)}
                  placeholder="Örn: Ağustos Koşucuları"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPendingExcelContacts(null);
                  setDuplicateContacts([]);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                onClick={confirmExcelUpload}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {loading ? 'Yükleniyor...' : 'Kişileri Kaydet ve Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI */}
      {editingContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Üye Bilgilerini Düzenle</h3>
              <button
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">İsim *</label>
                <input
                  type="text"
                  value={editingContact.first_name || editingContact.name?.split(' ')[0] || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, first_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soyisim</label>
                <input
                  type="text"
                  value={editingContact.last_name || editingContact.name?.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, last_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  value={editingContact.phone || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-Posta Adresi *</label>
                <input
                  type="email"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grup / Liste Adı</label>
                <input
                  type="text"
                  value={editingContact.group_name || 'Genel'}
                  onChange={(e) => setEditingContact({ ...editingContact, group_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateContact}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}