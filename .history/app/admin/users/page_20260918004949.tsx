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
  Ban
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
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // State untuk Modal Interaktif (Approve / Reject / Reset / Preview Foto)
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

  // Helper Normalisasi Nomor HP ke Format Internasional WhatsApp (62...)
  const formatPhoneForWA = (phone?: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  // Helper Kirim Notifikasi WhatsApp Gateway
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

  // Buka Modal Persetujuan
  const openApproveModal = (user: SystemUser) => {
    setSelectedUser(user);
    const initialRole = user.role && ['kasir', 'manajemen'].includes(user.role.toLowerCase()) 
      ? user.role.toLowerCase() 
      : 'kasir';
    setAssignedRole(initialRole);
    setAdminNote('Akun Anda telah disetujui oleh Administrator RSUD Bukit Kerman. Silakan login ke sistem SIMRS menggunakan kredensial Anda.');
    setModalMode('approve');
  };

  // Buka Modal Penolakan
  const openRejectModal = (user: SystemUser) => {
    setSelectedUser(user);
    setAdminNote('Mohon maaf, pendaftaran akun SIMRS Anda belum dapat disetujui karena kelengkapan data atau dokumen belum valid.');
    setModalMode('reject');
  };

  // Buka Modal Reset Password
  const openResetModal = (user: SystemUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setAdminNote('Kata sandi akun SIMRS Anda telah diperbarui/direset oleh Administrator.');
    setModalMode('reset');
  };

  // Buka Modal Perbesar Foto
  const openPhotoPreview = (photoUrl: string) => {
    setPreviewPhotoUrl(photoUrl);
    setModalMode('preview');
  };

  // Eksekusi Persetujuan Akun Staf + Kirim WA
  const handleConfirmVerify = async () => {
    if (!selectedUser) return;
    setIsSubmittingModal(true);
    setActionLoadingId(selectedUser.id);
    setMessage(null);

    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          is_active: true,
          role: assignedRole 
        })
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
      setModalMode(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memverifikasi: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat memverifikasi akun.' });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  // Eksekusi Penolakan Akun (Pindah ke Riwayat Ditolak) + Kirim WA
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

      // Ubah status menjadi inactive dan role menjadi 'rejected', simpan catatan di unit_kerja
      await supabase.from('users').update({ is_active: false, role: 'rejected' }).eq('id', selectedUser.id);
      await supabase.from('profiles').update({ unit_kerja: `DITOLAK: ${adminNote}` }).eq('id', selectedUser.id);

      setMessage({ type: 'success', text: `Pendaftaran atas nama "${namaStaf}" dipindahkan ke Riwayat Ditolak & notifikasi WA terkirim.` });
      
      setPendingUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setActiveUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setModalMode(null);
      fetchUsersData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal menolak pendaftaran: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat memperbarui data.' });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  // Hapus Permanen dari Riwayat Ditolak
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

  // Eksekusi Reset Password via Modal + Kirim WA
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
      if (!session) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');
      }

      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Gagal memperbarui kata sandi.');
      }

      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';
      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}\n\n*Password Baru Anda:* ${newPassword}\nSilakan jaga kerahasiaan sandi Anda dan ganti jika diperlukan.`;
        await sendWhatsAppNotification(phone, waMessage);
      }

      setMessage({ type: 'success', text: `Kata sandi untuk "${namaStaf}" berhasil diatur ulang & notifikasi WA terkirim.` });
      setModalMode(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal reset sandi: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat memperbarui sandi.' });
      }
    } finally {
      setIsSubmittingModal(false);
      setActionLoadingId(null);
    }
  };

  const currentList = activeTab === 'pending' ? pendingUsers : activeTab === 'active' ? activeUsers : rejectedUsers;
  const filteredUsers = currentList.filter((item) => {
    const query = searchTerm.toLowerCase();
    const name = item.profiles?.nama_lengkap?.toLowerCase() || '';
    const unit = item.profiles?.unit_kerja?.toLowerCase() || item.role?.toLowerCase() || '';
    const email = item.email?.toLowerCase() || '';
    return name.includes(query) || unit.includes(query) || email.includes(query);
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
        
        {/* Header Kartu Informasi Profesional */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-700 text-xs font-bold">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Modul Manajemen Pegawai</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-mono ml-1">
                {activeTab === 'pending' ? `${pendingUsers.length} Pending` : activeTab === 'active' ? `${activeUsers.length} Aktif` : `${rejectedUsers.length} Ditolak`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Verifikasi & Riwayat Akun Staf
            </h1>
            <p className="text-xs text-slate-500">
              Tinjau pendaftaran baru, kelola staf aktif, atau pantau riwayat pendaftaran yang ditolak.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Cari nama, unit, atau email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
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

        {/* --- 3 TAB SWITCHER (PENDING, AKTIF, DITOLAK) --- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Verifikasi ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('active'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Staf Aktif ({activeUsers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('rejected'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Riwayat Ditolak ({rejectedUsers.length})</span>
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs flex items-start space-x-2.5 border shadow-sm ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200/90 rounded-3xl p-6 h-72 animate-pulse flex flex-col justify-between shadow-md">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-slate-200 rounded-full w-24"></div>
                    <div className="h-4 bg-slate-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-20 bg-slate-100 rounded-2xl"></div>
                </div>
                <div className="h-10 bg-slate-200 rounded-2xl"></div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-12 text-center space-y-4 shadow-sm backdrop-blur-xl">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              {activeTab === 'pending' ? <UserCheck className="w-7 h-7" /> : activeTab === 'active' ? <History className="w-7 h-7" /> : <Ban className="w-7 h-7 text-rose-600" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800">
                {activeTab === 'pending' ? 'Tidak Ada Pengajuan Verifikasi' : activeTab === 'active' ? 'Belum Ada Staf Aktif' : 'Belum Ada Riwayat Penolakan'}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'pending' 
                  ? 'Seluruh pendaftaran baru telah diproses.'
                  : activeTab === 'active'
                  ? 'Belum ada akun staf yang disetujui.'
                  : 'Belum ada riwayat pendaftaran yang ditolak.'}
              </p>
            </div>
            <button
              onClick={fetchUsersData}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Periksa Pembaruan Data</span>
            </button>
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
                      {activeTab === 'pending' && (
                        <span className="inline-flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pending Approval</span>
                        </span>
                      )}
                      {activeTab === 'active' && (
                        <span className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif / Disetujui</span>
                        </span>
                      )}
                      {activeTab === 'rejected' && (
                        <span className="inline-flex items-center space-x-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <Ban className="w-3 h-3 text-rose-600" />
                          <span>Ditolak</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <div 
                        onClick={() => userPhotoUrl && openPhotoPreview(userPhotoUrl)}
                        className={`w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner relative group/foto ${userPhotoUrl ? 'cursor-pointer hover:border-emerald-500 transition' : ''}`}
                        title={userPhotoUrl ? 'Klik untuk memperbesar foto' : 'Tidak ada foto'}
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
                        <h2 className="text-sm font-bold text-slate-900 truncate" title={profile?.nama_lengkap || 'Tanpa Nama'}>
                          {profile?.nama_lengkap || 'Tanpa Nama'}
                        </h2>
                        <p className="text-xs text-emerald-700 font-semibold truncate uppercase" title={profile?.unit_kerja || item.role}>
                          {profile?.unit_kerja || item.role || 'Staf Rumah Sakit'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-700">{item.email || '-'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center space-x-1.5 truncate">
                          <FileBadge className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">NIK: <strong className="text-slate-800">{profile?.nik || '-'}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <FileBadge className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">NIP: <strong className="text-slate-800">{profile?.nip || '-'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">TTL: <strong className="text-slate-800">{profile?.tempat_lahir || '-' }, {profile?.tanggal_lahir || '-'}</strong></span>
                      </div>

                      <div className="flex items-center space-x-2 truncate justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">WhatsApp: <strong className="text-slate-800">{profile?.no_telepon || '-'}</strong></span>
                        </div>
                        {profile?.no_telepon && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-mono flex items-center space-x-0.5 flex-shrink-0" title="Nomor terdaftar untuk WhatsApp Gateway">
                            <Send className="w-2.5 h-2.5" />
                            <span>WA Ready</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* --- COMMAND BAR AKSI --- */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => openApproveModal(item)}
                          disabled={isActionProcessing}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title="Setujui Akun Staf"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>

                        <button
                          onClick={() => openResetModal(item)}
                          disabled={isActionProcessing}
                          className="bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 p-2.5 rounded-2xl transition flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                          title="Atur Ulang Kata Sandi"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600" />
                        </button>

                        <button
                          onClick={() => openRejectModal(item)}
                          disabled={isActionProcessing}
                          className="bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 p-2.5 rounded-2xl transition flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                          title="Tolak Pendaftaran"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}

                    {activeTab === 'active' && (
                      <>
                        <button
                          onClick={() => openResetModal(item)}
                          disabled={isActionProcessing}
                          className="flex-1 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                          title="Atur Ulang Kata Sandi Staf"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600" />
                          <span>Reset Sandi</span>
                        </button>

                        <button
                          onClick={() => openRejectModal(item)}
                          disabled={isActionProcessing}
                          className="bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 p-2.5 rounded-2xl transition flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                          title="Tolak / Pindahkan ke Arsip Penolakan"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}

                    {activeTab === 'rejected' && (
                      <button
                        onClick={() => handleDeletePermanent(item)}
                        disabled={isActionProcessing}
                        className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                        title="Hapus Permanen dari Riwayat"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Permanen</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ================= MODAL 1: PERSETUJUAN & CATATAN WA ================= */}
      {modalMode === 'approve' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Persetujuan & Kirim WA Gateway</span>
              </div>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap || 'Staf'}</h2>
              <p className="text-xs text-slate-500">Tentukan role dan catatan resmi yang otomatis terkirim ke WhatsApp staf.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Role Akses Sistem</label>
                <select 
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="kasir">KASIR</option>
                  <option value="manajemen">MANAJEMEN</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                  <MessageSquareText className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span>Catatan Admin (Pesan WhatsApp)</span>
                </label>
                <textarea 
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Tulis pesan untuk dikirim via WA..."
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} disabled={isSubmittingModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer">Batal</button>
              <button onClick={handleConfirmVerify} disabled={isSubmittingModal} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50">
                {isSubmittingModal ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  <span>Setujui & Kirim WA</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: PENOLAKAN & ALASAN WA ================= */}
      {modalMode === 'reject' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-rose-50 text-rose-700 px-3 py-1 rounded-xl text-xs font-bold">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Tolak Pendaftaran & Kirim WA</span>
              </div>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap || 'Staf'}</h2>
              <p className="text-xs text-slate-500">Berikan alasan penolakan. Data akan dipindahkan ke tab Riwayat Ditolak dan dikirim via WA.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                <MessageSquareText className="w-3.5 h-3.5 text-rose-600 mr-1" />
                <span>Alasan Penolakan (Pesan WhatsApp)</span>
              </label>
              <textarea 
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="Tulis alasan penolakan..."
              ></textarea>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} disabled={isSubmittingModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer">Batal</button>
              <button onClick={handleConfirmReject} disabled={isSubmittingModal} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50">
                {isSubmittingModal ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  <span>Tolak & Kirim WA</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RESET PASSWORD & NOTIF WA ================= */}
      {modalMode === 'reset' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Atur Ulang Sandi & Kirim WA</span>
              </div>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap || 'Staf'}</h2>
              <p className="text-xs text-slate-500">Masukkan sandi baru dan catatan admin yang dikirimkan langsung via WhatsApp Gateway.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Kata Sandi Baru</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                  <MessageSquareText className="w-3.5 h-3.5 text-amber-600 mr-1" />
                  <span>Catatan Admin (Pesan WhatsApp)</span>
                </label>
                <textarea 
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalMode(null)} disabled={isSubmittingModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer">Batal</button>
              <button onClick={handleConfirmResetPassword} disabled={isSubmittingModal || newPassword.length < 6} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50">
                {isSubmittingModal ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  <span>Perbarui & Kirim WA</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PRATINJAU FOTO ================= */}
      {modalMode === 'preview' && previewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-4 space-y-4 animate-in fade-in zoom-in duration-200 border border-slate-100 text-center relative">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Pratinjau Berkas Pas Foto Pegawai</span>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full h-96 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 shadow-inner">
              <img src={previewPhotoUrl} alt="Pratinjau Foto Penuh" className="w-full h-full object-contain" />
            </div>
            <div className="pb-2">
              <button onClick={() => setModalMode(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer">Tutup Pratinjau</button>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}