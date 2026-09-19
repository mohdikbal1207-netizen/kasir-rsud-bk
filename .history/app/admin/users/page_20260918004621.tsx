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
  MessageSquareText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface PendingUser {
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
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // State untuk Modal Interaktif (Approve / Reject / Reset / Preview Foto)
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | 'reset' | 'preview' | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  
  // State Input Form Modal
  const [assignedRole, setAssignedRole] = useState<string>('kasir');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  const router = useRouter();

  const fetchPendingUsers = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', false);

      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        setUsers([]);
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

      const combinedData: PendingUser[] = usersData.map((user) => ({
        ...user,
        profiles: profileMap.get(user.id) || null,
      }));

      setUsers(combinedData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat memuat data pendaftaran.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // Helper Kirim Notifikasi WhatsApp Gateway
  const sendWhatsAppNotification = async (phone: string, textMessage: string) => {
    if (!phone) return;
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: textMessage })
      });
    } catch (err) {
      console.error('Gagal mengirim WhatsApp Gateway:', err);
    }
  };

  // Buka Modal Persetujuan
  const openApproveModal = (user: PendingUser) => {
    setSelectedUser(user);
    const initialRole = user.role && ['kasir', 'manajemen'].includes(user.role.toLowerCase()) 
      ? user.role.toLowerCase() 
      : 'kasir';
    setAssignedRole(initialRole);
    setAdminNote('Akun Anda telah disetujui oleh Administrator. Silakan login ke sistem SIMRS.');
    setModalMode('approve');
  };

  // Buka Modal Penolakan
  const openRejectModal = (user: PendingUser) => {
    setSelectedUser(user);
    setAdminNote('Mohon maaf, pendaftaran akun Anda ditolak karena data kurang lengkap atau tidak valid.');
    setModalMode('reject');
  };

  // Buka Modal Reset Password
  const openResetModal = (user: PendingUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setAdminNote('Kata sandi akun SIMRS Anda telah diatur ulang oleh Administrator.');
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

      // Kirim Notifikasi WhatsApp Gateway
      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';
      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}\n\nRole Akses: ${assignedRole.toUpperCase()}\nStatus: AKTIF`;
        await sendWhatsAppNotification(phone, waMessage);
      }

      setMessage({ type: 'success', text: `Akun pegawai atas nama "${namaStaf}" berhasil disetujui & notifikasi WA terkirim.` });
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
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

  // Eksekusi Penolakan Akun + Kirim WA
  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    setIsSubmittingModal(true);
    setActionLoadingId(selectedUser.id);
    setMessage(null);

    try {
      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';

      // Kirim WA sebelum data dihapus
      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}`;
        await sendWhatsAppNotification(phone, waMessage);
      }

      await supabase.from('profiles').delete().eq('id', selectedUser.id);
      const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `Pendaftaran atas nama "${namaStaf}" ditolak, data dihapus, & notifikasi WA terkirim.` });
      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      setModalMode(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal menolak pendaftaran: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus data.' });
      }
    } finally {
      setIsSubmittingModal(false);
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

      // Kirim Notifikasi WhatsApp Gateway beserta password baru
      const phone = selectedUser.profiles?.no_telepon;
      const namaStaf = selectedUser.profiles?.nama_lengkap || 'Staf';
      if (phone) {
        const waMessage = `[RSUD BUKIT KERMAN - SIMRS]\nHalo ${namaStaf},\n\n${adminNote}\n\nPassword Baru Anda: *${newPassword}*\nSilakan jaga kerahasiaan sandi Anda.`;
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

  const filteredUsers = users.filter((item) => {
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
                {users.length} Pending
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Verifikasi Pendaftaran Akun Staf
            </h1>
            <p className="text-xs text-slate-500">
              Tinjau dokumen, tentukan role, berikan catatan admin, dan kirim notifikasi otomatis via WhatsApp Gateway.
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
              onClick={fetchPendingUsers}
              disabled={isLoading}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-12 text-center space-y-3 shadow-sm backdrop-blur-xl">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Tidak Ada Pengajuan Verifikasi</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Seluruh data pendaftaran akun pegawai telah diproses atau belum ada registrasi baru yang masuk.
            </p>
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
                      <span className="inline-flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Pending Approval</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
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
                        <p className="text-xs text-emerald-700 font-semibold truncate" title={profile?.unit_kerja || item.role}>
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

                      <div className="flex items-center space-x-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">WhatsApp: <strong className="text-slate-800">{profile?.no_telepon || '-'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* --- COMMAND BAR AKSI --- */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
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
                {isSubmittingModal ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>Setujui & Kirim WA</span>}
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
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Tolak Pendaftaran & Kirim WA</span>
              </div>
              <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">{selectedUser.profiles?.nama_lengkap || 'Staf'}</h2>
              <p className="text-xs text-slate-500">Berikan alasan penolakan. Pesan ini akan dikirim otomatis ke WhatsApp pendaftar sebelum akun dihapus.</p>
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
                {isSubmittingModal ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>Tolak & Kirim WA</span>}
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
                {isSubmittingModal ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>Perbarui & Kirim WA</span>}
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