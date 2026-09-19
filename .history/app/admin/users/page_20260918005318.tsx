'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Clock, 
  FileBadge, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  User,
  Search,
  Check,
  X,
  Users,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Building2,
  Maximize2,
  Trash2,
  MessageSquareText,
  Send,
  History,
  UserX,
  Ban,
  RotateCcw,
  ArrowUpDown,
  Copy,
  ClipboardCheck,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface SystemUser {
  id: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  profiles?: {
    nama_lengkap?: string;
    nik?: string;
    nip?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    unit_kerja?: string;
    no_telepon?: string;
    foto_url?: string | null;
    foto_uri?: string | null;
  } | null;
}

export default function AdminVerificationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  
  const [pendingUsers, setPendingUsers] = useState<SystemUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<SystemUser[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<SystemUser[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // State Modal Interaktif
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | 'reset' | 'preview' | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  
  // State Input Form Modal
  const [assignedRole, setAssignedRole] = useState<string>('kasir');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  const router = useRouter();

  // Fetch Data Berdasarkan Tab Aktif
  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      let query = supabase.from('users').select('*');

      if (activeTab === 'pending') {
        query = query.eq('is_active', false).neq('role', 'rejected');
      } else if (activeTab === 'active') {
        query = query.eq('is_active', true);
      } else if (activeTab === 'rejected') {
        query = query.eq('is_active', false).eq('role', 'rejected');
      }

      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        if (activeTab === 'pending') setPendingUsers([]);
        else if (activeTab === 'active') setActiveUsers([]);
        else setRejectedUsers([]);
        setIsLoading(false);
        return;
      }

      const userIds = usersData.map((u) => u.id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map();
      (profilesData || []).forEach((p) => {
        profileMap.set(p.id, p);
      });

      const combinedData: SystemUser[] = usersData.map((user) => ({
        ...user,
        profiles: profileMap.get(user.id) || null,
      }));

      if (activeTab === 'pending') setPendingUsers(combinedData);
      else if (activeTab === 'active') setActiveUsers(combinedData);
      else setRejectedUsers(combinedData);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat memuat data.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  // Helper Salin ke Clipboard
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper Normalisasi Nomor HP ke Format WhatsApp (62...)
  const formatPhoneForWA = (phone?: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const sendWhatsAppNotification = async (phone: string, textMessage: string) => {
    const formattedPhone = formatPhoneForWA(phone);
    if (!formattedPhone) return;
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, message: textMessage })
      });
    } catch (err) {
      console.error('Gagal mengirim WhatsApp Gateway:', err);
    }
  };

  // Buka Modal
  const openApproveModal = (user: SystemUser) => {
    setSelectedUser(user);
    const initialRole = user.role && ['kasir', 'manajemen'].includes(user.role.toLowerCase()) 
      ? user.role.toLowerCase() 
      : 'kasir';
    setAssignedRole(initialRole);
    setAdminNote('Akun Anda telah disetujui oleh Administrator RSUD Bukit Kerman. Silakan login ke sistem SIMRS menggunakan kredensial Anda.');
    setModalMode('approve');
  };

  const openRejectModal = (user: SystemUser) => {
    setSelectedUser(user);
    setAdminNote('Mohon maaf, pendaftaran akun SIMRS Anda belum dapat disetujui karena kelengkapan data atau dokumen belum valid.');
    setModalMode('reject');
  };

  const openResetModal = (user: SystemUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setAdminNote('Kata sandi akun SIMRS Anda telah diperbarui/direset oleh Administrator.');
    setModalMode('reset');
  };

  const openPhotoPreview = (photoUrl: string) => {
    setPreviewPhotoUrl(photoUrl);
    setModalMode('preview');
  };

  // Eksekusi Persetujuan
  const handleConfirmVerify = async () => {
    if (!selectedUser) return;
    setIsSubmittingModal(true);
    setActionLoadingId(selectedUser.id);
    setMessage(null);

    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ is_active: true, role: assignedRole })
        .eq('id', selectedUser.id);

      if (userError) throw userError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ unit_kerja: assignedRole.toUpperCase() })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';
      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}\n\n*Hak Akses Role:* ${assignedRole.toUpperCase()}\n*Status Akun:* AKTIF`;
        await sendWhatsAppNotification(phone, waMessage);
      }

      setMessage({ type: 'success', text: `Akun pegawai atas nama "${namaStaf}" berhasil disetujui & notifikasi WA terkirim.` });
      setPendingUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setRejectedUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setModalMode(null);
      fetchUsersData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memverifikasi: ${err.message}` });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  // Eksekusi Penolakan
  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    setIsSubmittingModal(true);
    setActionLoadingId(selectedUser.id);
    setMessage(null);

    try {
      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';

      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}`;
        await sendWhatsAppNotification(phone, waMessage);
      }

      await supabase.from('users').update({ is_active: false, role: 'rejected' }).eq('id', selectedUser.id);
      await supabase.from('profiles').update({ unit_kerja: `DITOLAK: ${adminNote}` }).eq('id', selectedUser.id);

      setMessage({ type: 'success', text: `Pendaftaran atas nama "${namaStaf}" dipindahkan ke Riwayat Ditolak.` });
      setPendingUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setActiveUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setModalMode(null);
      fetchUsersData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal menolak pendaftaran: ${err.message}` });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  // Pulihkan Akun Ditolak
  const handleRestoreUser = async (user: SystemUser) => {
    setActionLoadingId(user.id);
    setMessage(null);
    try {
      await supabase.from('users').update({ role: 'kasir', is_active: false }).eq('id', user.id);
      await supabase.from('profiles').update({ unit_kerja: 'KASIR' }).eq('id', user.id);

      setMessage({ type: 'success', text: `Akun atas nama "${user.profiles?.nama_lengkap || 'Staf'}" berhasil dipulihkan ke Pending.` });
      fetchUsersData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memulihkan: ${err.message}` });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Hapus Permanen
  const handleDeletePermanent = async (user: SystemUser) => {
    if (!confirm(`Hapus permanen data atas nama "${user.profiles?.nama_lengkap || 'Staf'}" dari sistem?`)) return;
    setActionLoadingId(user.id);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;

      setMessage({ type: 'success', text: 'Data riwayat penolakan berhasil dihapus permanen.' });
      setRejectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal menghapus: ${err.message}` });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset Sandi
  const handleConfirmResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      alert('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    setIsSubmittingModal(true);
    setActionLoadingId(selectedUser.id);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi admin tidak ditemukan.');

      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Gagal memperbarui sandi.');

      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';
      if (phone) {
        await sendWhatsAppNotification(phone, `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}\n\n*Password Baru Anda:* ${newPassword}`);
      }

      setMessage({ type: 'success', text: `Kata sandi untuk "${namaStaf}" berhasil diatur ulang.` });
      setModalMode(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal reset sandi: ${err.message}` });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  // Filter & Urutkan Data
  const currentList = activeTab === 'pending' ? pendingUsers : activeTab === 'active' ? activeUsers : rejectedUsers;
  
  const filteredUsers = currentList.filter((item) => {
    const query = searchTerm.toLowerCase();
    const name = item.profiles?.nama_lengkap?.toLowerCase() || '';
    const unit = item.profiles?.unit_kerja?.toLowerCase() || item.role?.toLowerCase() || '';
    const email = item.email?.toLowerCase() || '';
    
    const matchesSearch = name.includes(query) || unit.includes(query) || email.includes(query);
    const matchesUnit = unitFilter === 'all' || unit.includes(unitFilter.toLowerCase());

    return matchesSearch && matchesUnit;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    } else {
      const nameA = a.profiles?.nama_lengkap || '';
      const nameB = b.profiles?.nama_lengkap || '';
      return nameA.localeCompare(nameB);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Panel Administrator — Modul Verifikasi Pegawai"
        badgeText="Modul Admin"
        showBackButton={true}
        backUrl="/admin"
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10">
        
        {/* --- KARTU STATISTIK METRIK RINGKASAN --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => { setActiveTab('pending'); setSearchTerm(''); }} className={`bg-white/90 border p-5 rounded-3xl shadow-md transition cursor-pointer flex items-center justify-between backdrop-blur-xl ${activeTab === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'}`}>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verifikasi</span>
              <h2 className="text-2xl font-black text-amber-600">{pendingUsers.length}</h2>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div onClick={() => { setActiveTab('active'); setSearchTerm(''); }} className={`bg-white/90 border p-5 rounded-3xl shadow-md transition cursor-pointer flex items-center justify-between backdrop-blur-xl ${activeTab === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'}`}>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staf Aktif SIMRS</span>
              <h2 className="text-2xl font-black text-emerald-600">{activeUsers.length}</h2>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div onClick={() => { setActiveTab('rejected'); setSearchTerm(''); }} className={`bg-white/90 border p-5 rounded-3xl shadow-md transition cursor-pointer flex items-center justify-between backdrop-blur-xl ${activeTab === 'rejected' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-rose-300'}`}>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Ditolak</span>
              <h2 className="text-2xl font-black text-rose-600">{rejectedUsers.length}</h2>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* --- HEADER PENCARIAN & FILTER LANJUTAN --- */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Manajemen Data Staf Rumah Sakit
            </h1>
            <p className="text-xs text-slate-500">
              Gunakan pencarian, filter unit kerja, atau urutkan data sesuai kebutuhan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Unit Kerja */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="all">Semua Unit Kerja</option>
                <option value="kasir">Kasir</option>
                <option value="manajemen">Manajemen</option>
              </select>
            </div>

            {/* Urutkan / Sorting */}
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="newest">Pendaftaran Terbaru</option>
                <option value="oldest">Pendaftaran Terlama</option>
                <option value="name">Nama Staf (A-Z)</option>
              </select>
            </div>

            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Cari nama atau email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>

            <button
              onClick={fetchUsersData}
              disabled={isLoading}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* --- TAB SWITCHER --- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Verifikasi ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('active'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'active' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Staf Aktif ({activeUsers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('rejected'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Riwayat Ditolak ({rejectedUsers.length})</span>
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs flex items-start space-x-2.5 border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200/90 rounded-3xl p-6 h-72 animate-pulse shadow-md"></div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-12 text-center space-y-4 shadow-sm backdrop-blur-xl">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center mx-auto">
              {activeTab === 'pending' ? <UserCheck className="w-7 h-7" /> : activeTab === 'active' ? <History className="w-7 h-7" /> : <Ban className="w-7 h-7 text-rose-600" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800">Tidak Ada Data Ditemukan</h2>
              <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter unit kerja.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((item) => {
              const profile = item.profiles;
              const isActionProcessing = actionLoadingId === item.id;
              const userPhotoUrl = profile?.foto_url || profile?.foto_uri;

              return (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-5 transition hover:shadow-xl hover:border-emerald-300 relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {activeTab === 'pending' && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Pending Approval</span>}
                      {activeTab === 'active' && <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Aktif / Disetujui</span>}
                      {activeTab === 'rejected' && <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Ditolak</span>}

                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <div 
                        onClick={() => userPhotoUrl && openPhotoPreview(userPhotoUrl)}
                        className={`w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative group/foto ${userPhotoUrl ? 'cursor-pointer hover:border-emerald-500 transition' : ''}`}
                      >
                        {userPhotoUrl ? (
                          <>
                            <img src={userPhotoUrl} alt="Foto Staf" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/foto:opacity-100 transition flex items-center justify-center text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </>
                        ) : (
                          <User className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold text-slate-900 truncate">{profile?.nama_lengkap || 'Tanpa Nama'}</h2>
                        <p className="text-xs text-emerald-700 font-semibold truncate uppercase">{profile?.unit_kerja || item.role || 'Staf Rumah Sakit'}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-2 truncate justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate font-medium text-slate-700">{item.email || '-'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between truncate pr-1">
                          <span className="truncate">NIK: <strong className="text-slate-800">{profile?.nik || '-'}</strong></span>
                          {profile?.nik && (
                            <button onClick={() => copyToClipboard(profile.nik || '', `nik-${item.id}`)} className="text-slate-400 hover:text-emerald-600 cursor-pointer" title="Salin NIK">
                              {copiedField === `nik-${item.id}` ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between truncate">
                          <span className="truncate">NIP: <strong className="text-slate-800">{profile?.nip || '-'}</strong></span>
                          {profile?.nip && (
                            <button onClick={() => copyToClipboard(profile.nip || '', `nip-${item.id}`)} className="text-slate-400 hover:text-emerald-600 cursor-pointer" title="Salin NIP">
                              {copiedField === `nip-${item.id}` ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {activeTab === 'rejected' && profile?.unit_kerja?.startsWith('DITOLAK:') && (
                        <div className="pt-2 border-t border-rose-200 text-rose-700 text-[11px] font-medium bg-rose-50/50 p-2 rounded-xl">
                          <strong>Catatan:</strong> {profile.unit_kerja.replace('DITOLAK:', '').trim()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* --- COMMAND BAR AKSI --- */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {activeTab === 'pending' && (
                      <>
                        <button onClick={() => openApproveModal(item)} disabled={isActionProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1 cursor-pointer">
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button onClick={() => openResetModal(item)} disabled={isActionProcessing} className="bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 p-2.5 rounded-2xl transition flex items-center justify-center cursor-pointer shadow-sm" title="Reset Sandi">
                          <KeyRound className="w-4 h-4 text-amber-600" />
                        </button>
                        <button onClick={() => openRejectModal(item)} disabled={isActionProcessing} className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 p-2.5 rounded-2xl transition flex items-center justify-center cursor-pointer shadow-sm" title="Tolak">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}

                    {activeTab === 'active' && (
                      <>
                        <button onClick={() => openResetModal(item)} disabled={isActionProcessing} className="flex-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1 shadow-sm">
                          <KeyRound className="w-4 h-4 text-amber-600" />
                          <span>Reset Sandi</span>
                        </button>
                        <button onClick={() => openRejectModal(item)} disabled={isActionProcessing} className="bg-slate-100 hover:bg-rose-50 text-slate-700 p-2.5 rounded-2xl transition flex items-center justify-center shadow-sm" title="Tolak / Arsipkan">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}

                    {activeTab === 'rejected' && (
                      <>
                        <button onClick={() => handleRestoreUser(item)} disabled={isActionProcessing} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1 shadow-sm">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </button>
                        <button onClick={() => handleDeletePermanent(item)} disabled={isActionProcessing} className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-2.5 rounded-2xl transition flex items-center justify-center shadow-sm" title="Hapus Permanen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ================= MODAL 1: PERSETUJUAN ================= */}
      {modalMode === 'approve' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">Persetujuan & Kirim WA</span>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap}</h2>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Role Akses Sistem</label>
              <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold cursor-pointer">
                <option value="kasir">KASIR</option>
                <option value="manajemen">MANAJEMEN</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Catatan Pesan WhatsApp</label>
              <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium"></textarea>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-2xl cursor-pointer">Batal</button>
              <button onClick={handleConfirmVerify} disabled={isSubmittingModal} className="flex-1 bg-emerald-600 text-white font-bold text-xs py-3 rounded-2xl cursor-pointer">Setujui & Kirim</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: PENOLAKAN ================= */}
      {modalMode === 'reject' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl">Tolak Pendaftaran</span>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap}</h2>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Alasan Penolakan (Kirim via WA)</label>
              <textarea rows={4} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium"></textarea>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-2xl cursor-pointer">Batal</button>
              <button onClick={handleConfirmReject} disabled={isSubmittingModal} className="flex-1 bg-rose-600 text-white font-bold text-xs py-3 rounded-2xl cursor-pointer">Tolak & Arsipkan</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RESET PASSWORD ================= */}
      {modalMode === 'reset' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl">Atur Ulang Sandi</span>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap}</h2>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Kata Sandi Baru</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs font-medium" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Catatan Admin</label>
              <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium"></textarea>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-2xl cursor-pointer">Batal</button>
              <button onClick={handleConfirmResetPassword} disabled={isSubmittingModal || newPassword.length < 6} className="flex-1 bg-amber-600 text-white font-bold text-xs py-3 rounded-2xl cursor-pointer">Perbarui Sandi</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PRATINJAU FOTO ================= */}
      {modalMode === 'preview' && previewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-4 space-y-4 text-center relative">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Pratinjau Pas Foto</span>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="w-full h-96 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
              <img src={previewPhotoUrl} alt="Pratinjau Foto" className="w-full h-full object-contain" />
            </div>
            <button onClick={() => setModalMode(null)} className="w-full bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-2xl cursor-pointer">Tutup</button>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}