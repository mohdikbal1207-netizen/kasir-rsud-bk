    'use client';

    import { useState, useEffect } from 'react';
    import { 
    Users, 
    UserCheck, 
    UserX, 
    ShieldCheck, 
    Search, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Phone, 
    AlertCircle,
    RefreshCw
    } from 'lucide-react';
    import { createClient } from '@/utils/supabase/client'; // Sesuaikan path file client supabase Anda
    import PublicHeader from '@/components/public/PublicHeader';
    import PublicFooter from '@/components/public/PublicFooter';

    interface UserRecord {
    id: string;
    email: string;
    role: string;
    is_active: boolean; // true = disetujui/aktif, false = belum/pending
    created_at: string;
    }

    export default function AdminVerifikasiUserPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active'>('all');

    const supabase = createClient();

    // Fungsi Ambil Data Real dari Supabase
    const fetchUsers = async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        setUsers(data || []);
        } catch (err: unknown) {
        if (err instanceof Error) {
            setErrorMessage(err.message);
        } else {
            setErrorMessage('Gagal memuat data pengguna dari Supabase.');
        }
        } finally {
        setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Fungsi Update Status Aktivasi User di Supabase (is_active: true / false)
    const handleUpdateStatus = async (id: string, newStatus: boolean) => {
        try {
        const { error } = await supabase
            .from('users')
            .update({ is_active: newStatus })
            .eq('id', id);

        if (error) throw error;

        // Update state lokal setelah sukses di database
        setUsers((prev) =>
            prev.map((user) => (user.id === id ? { ...user, is_active: newStatus } : user))
        );
        } catch (err: unknown) {
        alert('Gagal memperbarui status user di database.');
        }
    };

    // Filter Data
    const filteredUsers = users.filter((user) => {
        const matchesSearch = 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filterStatus === 'pending') return matchesSearch && !user.is_active;
        if (filterStatus === 'active') return matchesSearch && user.is_active;
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* HEADER UTAMA */}
        <PublicHeader 
            title="RSUD BUKIT KERMAN" 
            subtitle="Panel Admin & Verifikasi Akun Pengguna SIMRS"
            badgeText="Supabase Real-Data"
            showBackButton={true}
            backUrl="/login"
        />

        {/* KONTEN UTAMA */}
        <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1 space-y-6 relative z-10">
            
            {/* BANNER INFORMASI */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 shadow-sm">
                <Users className="w-7 h-7" />
                </div>
                <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Verifikasi Pengguna Supabase</h1>
                <p className="text-xs text-slate-500">Mengambil data secara langsung dari tabel <code className="bg-slate-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">users</code>.</p>
                </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto">
                <button
                onClick={fetchUsers}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
                </button>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {users.filter(u => !u.is_active).length} Menunggu Validasi
                </span>
            </div>
            </div>

            {/* PESAN ERROR JIKA ADA */}
            {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
            </div>
            )}

            {/* KONTROL PENCARIAN & FILTER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm">
            
            <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari email atau role..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                onClick={() => setFilterStatus('all')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    filterStatus === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                >
                Semua
                </button>
                <button
                onClick={() => setFilterStatus('pending')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                >
                Pending (Belum Aktif)
                </button>
                <button
                onClick={() => setFilterStatus('active')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    filterStatus === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                >
                Aktif
                </button>
            </div>

            </div>

            {/* TABEL DATA SUPABASE */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Email Pengguna</th>
                    <th className="p-3.5">Role / Hak Akses</th>
                    <th className="p-3.5">Status Akun (is_active)</th>
                    <th className="p-3.5">Tanggal Dibuat</th>
                    <th className="p-3.5 pr-4 text-right">Aksi Verifikasi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                    {isLoading ? (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Memuat data dari database Supabase...
                        </td>
                    </tr>
                    ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 pl-4">
                            <div className="font-bold text-slate-900">{user.email}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {user.id}</div>
                        </td>
                        <td className="p-3.5">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                            {user.role || 'Staf / Kasir'}
                            </span>
                        </td>
                        <td className="p-3.5">
                            {user.is_active ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Aktif (True)
                            </span>
                            ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                <Clock className="w-3 h-3" /> Pending (False)
                            </span>
                            )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                            {new Date(user.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                            {!user.is_active ? (
                                <button
                                onClick={() => handleUpdateStatus(user.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                >
                                <UserCheck className="w-3.5 h-3.5" /> Setujui
                                </button>
                            ) : (
                                <button
                                onClick={() => handleUpdateStatus(user.id, false)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-xl transition cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                >
                                <UserX className="w-3.5 h-3.5" /> Nonaktifkan
                                </button>
                            )}
                            </div>
                        </td>
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                        Tabel <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">users</code> di Supabase masih kosong atau tidak ada data yang cocok.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
            </div>

        </main>

        {/* FOOTER */}
        <PublicFooter />

        </div>
    );
    }