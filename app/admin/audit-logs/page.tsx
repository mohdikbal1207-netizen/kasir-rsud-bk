'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Download, RefreshCcw, Search, Activity, PlusCircle, Edit3, Trash2, Calendar, ChevronLeft, ChevronRight, Copy, Check, FilterX, AlertCircle, Clock, Zap, ToggleLeft, ToggleRight, ListFilter, User, Target, ArrowUp, FileJson, AlignJustify, List, Maximize2, X, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State Filters & Sorting
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL'); 
  const [userFilter, setUserFilter] = useState<string>('ALL'); 
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); 
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false); 
  const [countdown, setCountdown] = useState<number>(15);

  // State Pagination & UI Interaktif
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20); 
  const [copiedId, setCopiedId] = useState<string | null>(null); 
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false); 
  const [isCompact, setIsCompact] = useState<boolean>(false);

  // State untuk Modal JSON Inspector Preview
  const [inspectModalData, setInspectModalData] = useState<{ isOpen: boolean; title: string; content: any }>({
    isOpen: false,
    title: '',
    content: null,
  });

  // State untuk Modal Pembersihan / Purge Log Lama
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [purgePassword, setPurgePassword] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchLogs = async (silentLoad = false) => {
    if (!silentLoad) setIsLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); 

      const { data, error } = await query;

      if (!error && data) {
        setLogs(data);
        if (!silentLoad) setCurrentPage(1);
      } else {
        console.error('Supabase error:', error);
      }
    } catch (err) {
      console.error('Gagal memuat audit logs:', err);
    } finally {
      if (!silentLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    if (isLiveMode) {
      setCountdown(15);
      timerInterval = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : 15));
      }, 1000);

      interval = setInterval(() => {
        fetchLogs(true);
        setCountdown(15);
      }, 15000);
    } else {
      setCountdown(15);
    }

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [isLiveMode]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const uniqueTables = useMemo(() => {
    const tables = logs.map(log => log.table_name).filter(Boolean);
    return Array.from(new Set(tables)).sort();
  }, [logs]);

  const uniqueUsers = useMemo(() => { 
    const users = logs.map(log => log.performed_by || log.admin_id).filter(Boolean);
    return Array.from(new Set(users)).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = 
        (log.table_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.admin_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.performed_by || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.record_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesTable = tableFilter === 'ALL' || log.table_name === tableFilter;
      const matchesUser = userFilter === 'ALL' || log.performed_by === userFilter || log.admin_id === userFilter; 

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const logDate = new Date(log.created_at);
        logDate.setHours(0, 0, 0, 0); 
        
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (logDate < from) matchesDate = false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(0, 0, 0, 0);
          if (logDate > to) matchesDate = false;
        }
      }

      return matchesSearch && matchesAction && matchesTable && matchesUser && matchesDate;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [logs, searchTerm, actionFilter, tableFilter, userFilter, dateFrom, dateTo, sortOrder]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const inserts = filteredLogs.filter(l => l.action === 'INSERT').length;
    const updates = filteredLogs.filter(l => l.action === 'UPDATE').length;
    const deletes = filteredLogs.filter(l => l.action === 'DELETE').length;
    return { total, inserts, updates, deletes };
  }, [filteredLogs]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentDisplayedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, tableFilter, userFilter, dateFrom, dateTo, sortOrder, itemsPerPage]);

  const hasActiveFilters = searchTerm !== '' || actionFilter !== 'ALL' || tableFilter !== 'ALL' || userFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';
  const handleResetFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setTableFilter('ALL');
    setUserFilter('ALL'); 
    setDateFrom('');
    setDateTo('');
  };

  const setQuickDate = (daysCount: number) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA'); 
    
    if (daysCount === 0) {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - daysCount);
      setDateFrom(pastDate.toLocaleDateString('en-CA'));
      setDateTo(todayStr);
    }
  };

  const handleIsolateRecord = (recordId: string) => {
    setSearchTerm(recordId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHrs < 24) return `${diffHrs} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return null; 
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyJSON = (logId: string, oldData: any, newData: any) => {
    const textToCopy = formatJSONForDisplay(oldData, newData);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(logId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data log untuk diekspor.');
      return;
    }
    const headers = ['Waktu', 'Nama Tabel', 'Aksi', 'ID Record', 'Admin ID', 'Performed By', 'Deskripsi', 'Data Lama', 'Data Baru'];
    const rows = filteredLogs.map(log => [
      `"${new Date(log.created_at).toLocaleString('id-ID')}"`,
      `"${log.table_name || '-'}"`,
      `"${log.action || '-'}"`,
      `"${log.record_id || '-'}"`,
      `"${log.admin_id || '-'}"`,
      `"${log.performed_by || '-'}"`,
      `"${log.description ? String(log.description).replace(/"/g, '""') : '-'}"`,
      `"${log.old_data ? JSON.stringify(log.old_data).replace(/"/g, '""') : '-'}"`,
      `"${log.new_data ? JSON.stringify(log.new_data).replace(/"/g, '""') : '-'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data log untuk diekspor.');
      return;
    }
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `Audit_Logs_RSUD_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePurgeLogs = async () => {
    if (purgePassword !== 'RSUD_BUKITKERMAN_ADMIN') {
      alert('Kode verifikasi administrator salah!');
      return;
    }
    setIsPurging(true);
    try {
      const { error } = await supabase.from('audit_logs').delete().neq('id', '0');
      if (error) throw error;
      alert('Semua riwayat audit log berhasil dibersihkan.');
      setShowPurgeModal(false);
      setPurgePassword('');
      fetchLogs();
    } catch (err) {
      console.error('Gagal membersihkan log:', err);
      alert('Gagal menghapus log dari database.');
    } finally {
      setIsPurging(false);
    }
  };

  const getTableColor = (tableName: string) => {
    const name = (tableName || '').toLowerCase();
    if (name.includes('pasien')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (name.includes('billing') || name.includes('transaksi') || name.includes('kwitansi')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (name.includes('obat') || name.includes('apotek')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (name.includes('absensi')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (name.includes('igd') || name.includes('tindakan')) return 'bg-red-50 text-red-700 border-red-200';
    if (name.includes('settings') || name.includes('users')) return 'bg-slate-100 text-slate-700 border-slate-300';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const formatJSONForDisplay = (dataLama: any, dataBaru: any) => {
    const obj: any = {};
    if (dataLama) obj.data_lama = dataLama;
    if (dataBaru) obj.data_baru = dataBaru;
    if (Object.keys(obj).length === 0) return 'Data payload kosong.';
    return JSON.stringify(obj, null, 2);
  };

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') return [];
    const changed: string[] = [];
    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    keys.forEach(key => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changed.push(key);
      }
    });
    return changed;
  };

  const tdPad = isCompact ? 'p-2.5' : 'p-4';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Pusat Log Jejak Audit Database"
        badgeText="Audit Logs"
        showBackButton={true}
        backUrl="/admin"
      />

      {/* Modal Inspector Detail JSON */}
      {inspectModalData.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <FileJson className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">{inspectModalData.title}</h3>
              </div>
              <button
                onClick={() => setInspectModalData({ isOpen: false, title: '', content: null })}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-emerald-300 bg-[#0b1324] scrollbar-thin scrollbar-thumb-slate-700">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(inspectModalData.content, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectModalData.content, null, 2));
                  alert('Data JSON berhasil disalin ke clipboard!');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Salin JSON Lengkap
              </button>
              <button
                onClick={() => setInspectModalData({ isOpen: false, title: '', content: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Purge */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Peringatan Keamanan</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus seluruh riwayat audit log secara permanen.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Masukkan Kode Otorisasi Admin:</label>
              <input 
                type="password"
                value={purgePassword}
                onChange={(e) => setPurgePassword(e.target.value)}
                placeholder="Ketik kode otorisasi..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Default sandi simulasi: <code className="text-rose-600 font-bold">RSUD_BUKITKERMAN_ADMIN</code></span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowPurgeModal(false); setPurgePassword(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handlePurgeLogs}
                disabled={isPurging}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {isPurging ? 'Menghapus...' : 'Ya, Bersihkan Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-3 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 hover:-translate-y-1 transition-all duration-300 ${showScrollTop ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible'}`}
        title="Kembali ke Atas"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* Banner Utama */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-700 text-xs font-bold">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Rekaman Otomatis Tingkat Database</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Daftar Jejak Audit (Audit Trail)
              {isLiveMode && (
                <span className="flex items-center gap-1.5 bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black border border-rose-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Live ({countdown}s)
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              Memantau setiap aktivitas perubahan, penambahan, atau penghapusan data secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`inline-flex items-center justify-center space-x-2 border font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 shadow-sm ${
                isLiveMode 
                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title="Aktifkan Auto-Refresh setiap 15 detik"
            >
              <Zap className={`w-3.5 h-3.5 ${isLiveMode ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Live Mode</span>
              {isLiveMode ? <ToggleRight className="w-4 h-4 ml-1" /> : <ToggleLeft className="w-4 h-4 ml-1 text-slate-300" />}
            </button>

            <div className="group relative inline-block">
              <button className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor Data</span>
              </button>
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-t-xl transition flex items-center gap-2">
                   <AlignJustify className="w-3.5 h-3.5" /> Format CSV
                </button>
                <button onClick={handleExportJSON} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition flex items-center gap-2">
                   <FileJson className="w-3.5 h-3.5" /> Format JSON
                </button>
                <button onClick={() => setShowPurgeModal(true)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-b-xl transition flex items-center gap-2 border-t border-slate-100">
                   <Trash2 className="w-3.5 h-3.5" /> Bersihkan Log
                </button>
              </div>
            </div>

            <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
               <button
                  onClick={() => setIsCompact(false)}
                  className={`p-1.5 rounded-lg transition ${!isCompact ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Tampilan Longgar"
                >
                  <List className="w-4 h-4" />
               </button>
               <button
                  onClick={() => setIsCompact(true)}
                  className={`p-1.5 rounded-lg transition ${isCompact ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Tampilan Kompak (Rapat)"
                >
                  <AlignJustify className="w-4 h-4" />
               </button>
            </div>

            <button
              onClick={() => fetchLogs()} 
              disabled={isLoading}
              className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95"
              title="Refresh Manual"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Kartu Statistik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3 transition hover:shadow-md">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Terfilter / Server</span>
              <span className="text-lg font-black text-slate-900">{stats.total} <span className="text-xs font-normal text-slate-400">({logs.length} loaded)</span></span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3 transition hover:shadow-md">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insert Data</span>
              <span className="text-lg font-black text-sky-700">{stats.inserts}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3 transition hover:shadow-md">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Update Data</span>
              <span className="text-lg font-black text-amber-700">{stats.updates}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3 transition hover:shadow-md">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delete Data</span>
              <span className="text-lg font-black text-rose-700">{stats.deletes}</span>
            </div>
          </div>
        </div>

        {/* Kontrol Utama & Tabel */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 relative">
          
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full xl:w-auto">
              
              <div className="relative flex-1 w-full md:w-56 group">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari kata kunci..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-12 py-2 text-xs focus:outline-none focus:border-emerald-500 transition focus:bg-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded pointer-events-none">
                  /
                </div>
              </div>

              <div className="relative w-full md:w-44">
                <ListFilter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select 
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs focus:outline-none focus:border-emerald-500 transition focus:bg-white appearance-none cursor-pointer font-bold text-slate-600 truncate"
                >
                  <option value="ALL">Semua Tabel</option>
                  {uniqueTables.map(tbl => (
                    <option key={tbl} value={tbl}>{tbl}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full md:w-44">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select 
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs focus:outline-none focus:border-emerald-500 transition focus:bg-white appearance-none cursor-pointer font-bold text-slate-600 truncate"
                >
                  <option value="ALL">Semua User</option>
                  {uniqueUsers.map(usr => (
                    <option key={usr} value={usr}>{usr}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-emerald-500 focus-within:bg-white transition w-full sm:w-auto">
                  <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 focus:outline-none w-full sm:w-28 cursor-pointer"
                  />
                  <span className="mx-1.5 text-slate-400 text-xs font-bold">-</span>
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 focus:outline-none w-full sm:w-28 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => setQuickDate(0)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition"
                  >
                    <Clock className="w-3 h-3" /> Hari Ini
                  </button>
                  <button 
                    onClick={() => setQuickDate(7)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition"
                  >
                    7 Hari
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide shrink-0">
              {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map((action) => (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    actionFilter === action 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {action}
                </button>
              ))}
              
              {hasActiveFilters && (
                <button 
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center gap-1 transition whitespace-nowrap ml-1"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

          </div>

          {/* Chips Filter Aktif Cepat */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter Aktif:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium">
                  Keyword: &quot;{searchTerm}&quot;
                  <button onClick={() => setSearchTerm('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {actionFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-medium">
                  Aksi: {actionFilter}
                  <button onClick={() => setActionFilter('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {tableFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-medium">
                  Tabel: {tableFilter}
                  <button onClick={() => setTableFilter('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {userFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-[11px] font-medium">
                  User: {userFilter}
                  <button onClick={() => setUserFilter('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[11px] font-medium">
                  Tanggal: {dateFrom || '...'} s.d {dateTo || '...'}
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm relative max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs relative">
              <thead className="bg-slate-100 text-slate-500 uppercase font-black tracking-wider text-[10px] sticky top-0 z-20 shadow-sm outline outline-1 outline-slate-200">
                <tr>
                  <th className={`${tdPad} border-b border-slate-200 w-32 bg-slate-100 transition-all`}>Waktu</th>
                  <th className={`${tdPad} border-b border-slate-200 bg-slate-100 transition-all`}>Nama Tabel</th>
                  <th className={`${tdPad} border-b border-slate-200 text-center bg-slate-100 transition-all`}>Aksi</th>
                  <th className={`${tdPad} border-b border-slate-200 bg-slate-100 transition-all`}>ID Record</th>
                  <th className={`${tdPad} border-b border-slate-200 bg-slate-100 transition-all`}>Admin / Pelaku</th>
                  <th className={`${tdPad} border-b border-slate-200 bg-slate-100 transition-all`}>Payload Data (JSON / Detail)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium bg-white">
                {isLoading && logs.length === 0 ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse border-l-4 border-l-slate-200 bg-white hover:bg-transparent">
                      <td className={tdPad}><div className="h-3.5 bg-slate-200 rounded w-20 mb-2"></div><div className="h-2.5 bg-slate-100 rounded w-12"></div></td>
                      <td className={tdPad}><div className="h-6 bg-slate-100 rounded-lg w-24"></div></td>
                      <td className={tdPad}><div className="h-6 bg-slate-100 rounded-lg w-16 mx-auto"></div></td>
                      <td className={tdPad}><div className="h-5 bg-slate-100 rounded border border-slate-200 w-28"></div></td>
                      <td className={tdPad}><div className="h-3.5 bg-slate-200 rounded w-28 mb-2"></div><div className="h-3 bg-slate-100 rounded w-20"></div></td>
                      <td className={tdPad}><div className="h-7 bg-emerald-50 border border-emerald-100 rounded-lg w-32"></div></td>
                    </tr>
                  ))
                ) : currentDisplayedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-24 text-slate-400 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                        </div>
                        <span className="font-bold text-slate-600 text-sm">Tidak Ada Log Ditemukan</span>
                        <span className="text-xs">Ubah parameter pencarian atau reset filter Anda.</span>
                        {hasActiveFilters && (
                          <button onClick={handleResetFilters} className="mt-4 text-emerald-600 font-bold hover:underline">
                            Reset Semua Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentDisplayedLogs.map((log) => {
                    const changedFields = log.action === 'UPDATE' ? getChangedFields(log.old_data, log.new_data) : [];
                    const relativeTime = getRelativeTime(log.created_at); 
                    
                    return (
                      <tr key={log.id} className={`hover:bg-slate-50 transition duration-150 group/row border-l-4 ${
                        log.action === 'INSERT' ? 'border-l-sky-400' :
                        log.action === 'UPDATE' ? 'border-l-amber-400' :
                        log.action === 'DELETE' ? 'border-l-rose-400' : 'border-l-transparent'
                      }`}>
                        <td className={`${tdPad} text-slate-500 font-mono whitespace-nowrap align-top transition-all`}>
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-bold">{new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                            <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString('id-ID')}</span>
                            {relativeTime && (
                              <span className="text-[9px] mt-1 font-bold text-emerald-600 bg-emerald-50 w-max px-1.5 py-0.5 rounded border border-emerald-100">
                                {relativeTime}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`${tdPad} font-bold text-slate-900 align-top transition-all`}>
                          <span className={`px-3 py-1.5 rounded-lg border text-[11px] ${getTableColor(log.table_name)}`}>
                            {log.table_name || '-'}
                          </span>
                        </td>
                        <td className={`${tdPad} text-center align-top transition-all`}>
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest ${
                            log.action === 'INSERT' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                            log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {log.action || 'INFO'}
                          </span>
                        </td>
                        <td className={`${tdPad} text-slate-500 font-mono text-[11px] align-top transition-all`}>
                          {log.record_id ? (
                            <div className="flex items-center gap-1.5 group/isolate max-w-[140px]">
                              <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 border border-slate-200 truncate" title={log.record_id}>
                                {log.record_id}
                              </span>
                              <button 
                                onClick={() => handleIsolateRecord(log.record_id)}
                                className="p-1 rounded bg-white text-slate-400 border border-slate-200 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition opacity-0 group-hover/isolate:opacity-100 focus:opacity-100"
                                title="Fokuskan riwayat pada ID ini"
                              >
                                <Target className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 border border-slate-200">-</span>
                          )}
                        </td>
                        <td className={`${tdPad} align-top transition-all`}>
                          <div className="flex flex-col max-w-[140px]">
                             <span className="text-slate-800 font-bold truncate" title={log.performed_by || log.admin_id}>
                               {log.performed_by || log.admin_id || 'Sistem'}
                             </span>
                             {log.target_user_id && <span className="text-[9px] text-slate-400 font-mono truncate mt-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-100" title={log.target_user_id}>Target: {log.target_user_id}</span>}
                          </div>
                        </td>
                        <td className={`${tdPad} text-slate-600 font-mono align-top w-[40%] transition-all`}>
                          <div className="flex items-center gap-2">
                            <details className="cursor-pointer group/details relative flex-1">
                              <summary className="text-emerald-600 font-bold hover:text-emerald-700 inline-flex items-center space-x-1.5 select-none outline-none bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition group-open/details:bg-emerald-100">
                                <span className="group-open/details:hidden">Lihat Payload JSON</span>
                                <span className="hidden group-open/details:inline">Tutup Payload</span>
                              </summary>
                              
                              {log.action === 'UPDATE' && changedFields.length > 0 && (
                                 <div className="mt-2.5 mb-1 text-[10px] text-slate-500 font-sans flex flex-wrap gap-1">
                                    <span className="mr-1">Berubah:</span>
                                    {changedFields.map(field => (
                                      <span key={field} className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-200">
                                        {field}
                                      </span>
                                    ))}
                                 </div>
                              )}
                              
                              <div className="mt-2 relative bg-[#0f172a] rounded-xl border border-slate-700 shadow-xl overflow-hidden group/jsonbox">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCopyJSON(log.id, log.old_data, log.new_data);
                                  }}
                                  className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-slate-200 p-1.5 rounded-lg flex items-center justify-center transition opacity-0 group-hover/jsonbox:opacity-100 z-10"
                                  title="Salin JSON"
                                >
                                  {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                
                                {log.description && (
                                  <div className="p-3 bg-slate-800/80 text-slate-300 border-b border-slate-700 text-xs font-sans">
                                    <strong className="text-emerald-400">Deskripsi:</strong> {log.description}
                                  </div>
                                )}

                                {log.action === 'UPDATE' && log.old_data && log.new_data ? (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700">
                                    <div className="p-4 overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent bg-[#151f32]">
                                      <div className="text-[10px] text-amber-500 font-black mb-2 flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> DATA LAMA
                                      </div>
                                      <pre className="text-[11px] text-slate-300 leading-relaxed font-mono">
                                        {JSON.stringify(log.old_data, null, 2)}
                                      </pre>
                                    </div>
                                    <div className="p-4 overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                      <div className="text-[10px] text-sky-400 font-black mb-2 flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-sky-400"></div> DATA BARU
                                      </div>
                                      <pre className="text-[11px] text-emerald-300 leading-relaxed font-mono">
                                        {JSON.stringify(log.new_data, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                    <div className="text-[10px] text-slate-400 font-black mb-2 uppercase">
                                      PAYLOAD {log.action}
                                    </div>
                                    <pre className="text-[11px] text-emerald-300 leading-relaxed font-mono">
                                      {formatJSONForDisplay(log.old_data, log.new_data)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>

                            {/* Tombol Inspector Modal */}
                            <button
                              onClick={() => setInspectModalData({
                                isOpen: true,
                                title: `Inspeksi Log [${log.table_name} - ${log.action}] ID: ${log.record_id || log.id}`,
                                content: log
                              })}
                              className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 rounded-lg transition"
                              title="Perbesar / Inspector Modal"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Kontrol Paginasi */}
          {!isLoading && totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  Menampilkan <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="font-bold text-slate-700">{filteredLogs.length}</span> log terfilter
                </span>
                
                <select 
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                >
                  <option value={20}>20 baris</option>
                  <option value={50}>50 baris</option>
                  <option value={100}>100 baris</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold px-3 text-slate-700">
                  Hal {currentPage} <span className="text-slate-400 font-normal mx-1">/</span> {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <AdminFooter />
    </div>
  );
}