'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, CheckCircle2, Clock, XCircle, Search, 
  Printer, Eye, ShieldCheck, Database, Building2, ArrowLeft, X, User, Calendar 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/admin/AdminHeader';
import KasirFooter from '@/components//admin/AdminFooter';

interface RanapHeader {
  id: string;
  no_reg: string;
  nama_pasien: string;
  umur: string;
  alamat: string;
  diagnosa: string;
  ruang: string;
  masuk_tgl: string;
  keluar_tgl: string;
  dokter_merawat: string;
  kepala_ruangan: string;
  bendahara_penerima: string;
  status_verifikasi: string;
  created_at: string;
}

interface RanapItem {
  id: string;
  kategori_biaya: string;
  nama_item: string;
  volume: number;
  tarif_satuan: number;
  jumlah_total: number;
  ditanggung_pihak3: number;
  selisih_bayar: number;
}

export default function AdminRanapPage() {
  const router = useRouter();
  const [patientList, setPatientList] = useState<RanapHeader[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State untuk Modal Detail & Cetak Rincian Biaya
  const [selectedPatient, setSelectedPatient] = useState<RanapHeader | null>(null);
  const [patientItems, setPatientItems] = useState<RanapItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // Ambil Data dari Supabase saat komponen dimuat
  const fetchRanapData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ranap_billing_header')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatientList(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil data ranap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanapData();
  }, []);

  // Buka Modal Detail & Ambil Item Biaya Berdasarkan No. Reg
  const handleOpenDetail = async (patient: RanapHeader) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from('ranap_billing_items')
        .select('*')
        .eq('no_reg', patient.no_reg);

      if (error) throw error;
      setPatientItems(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil item rincian:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Ubah Status Verifikasi Admin
  const handleUpdateStatus = async (noReg: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('ranap_billing_header')
        .update({ status_verifikasi: newStatus })
        .eq('no_reg', noReg);

      if (error) throw error;
      alert(`Status verifikasi berhasil diubah menjadi ${newStatus}`);
      fetchRanapData();
      if (selectedPatient && selectedPatient.no_reg === noReg) {
        setSelectedPatient({ ...selectedPatient, status_verifikasi: newStatus });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui status:', err);
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  // Filter Pencarian Pasien
  const filteredPatients = patientList.filter(p => 
    p.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.no_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ruang?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      
      {/* Header Admin */}
      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Panel Verifikasi Admin — Perincian Rawat Inap" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Navigasi Atas & Judul */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Verifikasi & Data Pasien Rawat Inap</h1>
            <p className="text-xs text-slate-500">Kelola dan verifikasi rincian biaya perawatan pasien rawat inap yang diinput kasir.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Panel Pencarian & Statistik Ringkas */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama pasien atau No. Reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600 w-full sm:w-auto justify-end">
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
              Total Data: {filteredPatients.length} Pasien
            </span>
          </div>
        </div>

        {/* Tabel Data Pasien Ranap */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                  <th className="p-3.5">No. Reg</th>
                  <th className="p-3.5">Nama Pasien</th>
                  <th className="p-3.5">Ruang / Kelas</th>
                  <th className="p-3.5">Diagnosa</th>
                  <th className="p-3.5">Tgl Masuk / Keluar</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                  <th className="p-3.5 text-center">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Memuat data dari database...</td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Belum ada data perincian biaya rawat inap yang tersimpan.</td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{patient.no_reg}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{patient.nama_pasien}</p>
                        <p className="text-[11px] text-slate-400">{patient.umur} • {patient.alamat}</p>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">{patient.ruang}</td>
                      <td className="p-3.5">{patient.diagnosa || '-'}</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {patient.masuk_tgl ? new Date(patient.masuk_tgl).toLocaleDateString('id-ID') : '-'} s.d. <br />
                        {patient.keluar_tgl ? new Date(patient.keluar_tgl).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          patient.status_verifikasi === 'VERIFIED_ADMIN' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : patient.status_verifikasi === 'PAID'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {patient.status_verifikasi}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(patient)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                            title="Lihat Detail & Verifikasi"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* MODAL DETAIL & VERIFIKASI ADMIN */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-800 relative max-h-[90vh] flex flex-col">
            
            {/* Tombol Tutup */}
            <button 
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Modal */}
            <div className="pb-4 border-b border-slate-200 pr-10">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                Verifikasi Admin RSUD Bukit Kerman
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">{selectedPatient.nama_pasien}</h2>
              <p className="text-xs text-slate-500">No. Reg: <span className="font-mono font-bold text-slate-700">{selectedPatient.no_reg}</span> • Ruang: {selectedPatient.ruang}</p>
            </div>

            {/* Konten Rincian Biaya dalam Modal */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block">Umur / Alamat:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.umur || '-'} • {selectedPatient.alamat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Diagnosa:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.diagnosa || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dokter Merawat:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.dokter_merawat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bendahara / Verifikator:</span>
                  <span className="font-bold text-emerald-700">{selectedPatient.bendahara_penerima || '-'}</span>
                </div>
              </div>

              {/* Tabel Item Biaya */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Uraian Biaya</th>
                      <th className="p-2.5 text-center">Vol</th>
                      <th className="p-2.5 text-right">Tarif (Rp)</th>
                      <th className="p-2.5 text-right">Total (Rp)</th>
                      <th className="p-2.5 text-right">Ditanggung (Pihak III)</th>
                      <th className="p-2.5 text-right">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingItems ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Memuat rincian item...</td>
                      </tr>
                    ) : patientItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Tidak ada rincian item tercatat.</td>
                      </tr>
                    ) : (
                      patientItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-emerald-800">{item.kategori_biaya}</td>
                          <td className="p-2.5 text-slate-800">{item.nama_item}</td>
                          <td className="p-2.5 text-center">{item.volume}</td>
                          <td className="p-2.5 text-right font-mono">Rp {Number(item.tarif_satuan).toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right font-bold font-mono">Rp {Number(item.jumlah_total).toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right text-emerald-700 font-mono">Rp {Number(item.ditanggung_pihak3).toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right text-rose-700 font-bold font-mono">Rp {Number(item.selisih_bayar).toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Aksi Footer Modal */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500">Ubah Status:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedPatient.no_reg, 'VERIFIED_ADMIN')}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Set Verified
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedPatient.no_reg, 'PAID')}
                  className="px-3 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Set Lunas (Paid)
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Print</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <KasirFooter />

    </div>
  );
}