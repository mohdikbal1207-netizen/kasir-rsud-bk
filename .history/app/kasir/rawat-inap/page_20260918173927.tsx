'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Plus, ShieldCheck, Eraser, UserCheck, 
  Calendar, Search, Printer, Eye, RefreshCw, FileText, CheckCircle2,
  ListFilter, Clock, AlertCircle, CheckSquare, Square, MessageSquare,
  X, AlertTriangle, Info, Printer as PrinterIcon, Lock, UserSearch, Check,
  Layers, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface BillingItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  tarif: number;
  isCovered: boolean;
}

interface SavedBillingHeader {
  no_reg: string;
  nama_pasien: string;
  nik_pasien?: string;
  umur?: string;
  alamat?: string;
  diagnosa?: string;
  ruang?: string;
  jenis_penjaminan: string;
  metode_pembayaran: string;
  masuk_tgl?: string;
  keluar_tgl?: string;
  bendahara_penerima?: string;
  created_at?: string;
  status_verifikasi?: string;
  catatan_admin?: string;
  total_biaya?: number;
  total_ditanggung?: number;
  total_selisih?: number;
}

const CATEGORIES = [
  'I. RUANGAN PERAWATAN / BAGIAN',
  'II. MAKAN',
  'III. VISIT',
  'IV. OBAT-OBATAN',
  'V. OPERASI',
  'VI. PENUNJANG MEDIK',
  'VII. LAIN LAIN'
];

const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseNumber = (val: string): number => {
  const cleanStr = val.replace(/\./g, '');
  const parsed = parseInt(cleanStr, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export default function InputRawatInapPage() {
  const router = useRouter();
  
  // Tab Navigasi State: 'input' atau 'riwayat'
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat'>('input');
  
  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>([]);
  
  // State untuk Pop-up Detail Riwayat Pasien
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [activeDetailPasien, setActiveDetailPasien] = useState<SavedBillingHeader | null>(null);
  const [activeDetailItems, setActiveDetailItems] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingList, setFetchingList] = useState<boolean>(false);
  const [searchingNik, setSearchingNik] = useState<boolean>(false);

  const [logoKerinciErr, setLogoKerinciErr] = useState<boolean>(false);
  const [logoRsudErr, setLogoRsudErr] = useState<boolean>(false);

  const [savedBillings, setSavedBillings] = useState<SavedBillingHeader[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterPenjaminan, setFilterPenjaminan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [modalNotif, setModalNotif] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    showPrintOption?: boolean;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: '',
    showPrintOption: false
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  const [patientData, setPatientData] = useState({
    noReg: 'REG-RANAP-' + Date.now().toString().slice(-6),
    jenisPenjaminan: 'UMUM / MANDIRI',
    metodePembayaran: 'Tunai / Cash',
    namaPasien: '',
    nikPasien: '',
    umur: '',
    alamat: '',
    diagnosa: '',
    ruangPerawatan: 'VIP Melati',
    noBpjs: '',
    noSep: '',
    masukTgl: new Date().toISOString().split('T')[0],
    keluarTgl: new Date().toISOString().split('T')[0],
    dokterMerawat: '',
    kepalaRuangan: '',
    bendahara: 'Memuat data petugas...',
    petugasNip: '',
    petugasEmail: '',
    signatureBase64: '',
    statusVerifikasi: 'NEW', 
    catatanAdmin: ''
  });

  const isFormLocked = patientData.statusVerifikasi === 'VERIFIED' || 
                      patientData.statusVerifikasi === 'VERIFIED_ADMIN' || 
                      patientData.statusVerifikasi === 'PENDING_VERIFIKASI';

  // Mengambil data petugas secara dinamis dari tabel profiles dan akun auth yang login
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (user) {
          let petugasNama = '';
          let petugasNipVal = '-';

          // 1. Coba ambil data dari tabel profiles di database Supabase
          try {
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (profileData && !profileErr) {
              petugasNama = profileData.nama_lengkap || profileData.nama || profileData.full_name || '';
              petugasNipVal = profileData.nip || profileData.nomor_induk || '-';
            }
          } catch (dbErr) {
            console.log('Tabel profiles tidak diakses, menggunakan metadata auth.');
          }

          // 2. Jika di tabel profiles kosong, fallback ke user_metadata atau email
          if (!petugasNama || petugasNama === 'SAMPEL KASIR') {
            const meta = user.user_metadata || {};
            petugasNama = 
              meta.nama_lengkap || 
              meta.full_name || 
              meta.name || 
              user.email?.split('@')[0].toUpperCase() || 
              'PETUGAS KASIR';
          }

          if (petugasNipVal === '-' || !petugasNipVal) {
            const meta = user.user_metadata || {};
            petugasNipVal = meta.nip || '-';
          }

          setPatientData(prev => ({
            ...prev,
            bendahara: petugasNama.toUpperCase(),
            petugasNip: petugasNipVal,
            petugasEmail: user.email || ''
          }));
        }
      } catch (err) {
        console.error('Gagal mengambil data akun login:', err);
      }
    };

    fetchCurrentUser();
    loadSavedBillings();
  }, []);

  const handleCariPasienLama = async () => {
    if (!patientData.nikPasien || patientData.nikPasien.trim().length < 5) {
      setModalNotif({
        show: true,
        type: 'warning',
        title: 'NIK Belum Valid',
        message: 'Masukkan minimal 5 digit NIK pasien untuk mencari data kunjungan sebelumnya.'
      });
      return;
    }

    setSearchingNik(true);
    try {
      const { data, error } = await supabase
        .from('ranap_billing_header')
        .select('*')
        .eq('nik_pasien', patientData.nikPasien.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const pasienLama = data[0];
        setPatientData(prev => ({
          ...prev,
          namaPasien: pasienLama.nama_pasien || '',
          umur: pasienLama.umur || '',
          alamat: pasienLama.alamat || '',
          ruangPerawatan: pasienLama.ruang || prev.ruangPerawatan,
          jenisPenjaminan: pasienLama.jenis_penjaminan || prev.jenisPenjaminan,
          noReg: 'REG-RANAP-' + Date.now().toString().slice(-6)
        }));

        setModalNotif({
          show: true,
          type: 'success',
          title: 'Data Pasien Lama Ditemukan!',
          message: `Berhasil memuat data atas nama ${pasienLama.nama_pasien}. Sistem telah menghasilkan No. Registrasi baru untuk kunjungan ini.`
        });
      } else {
        setModalNotif({
          show: true,
          type: 'info',
          title: 'Pasien Baru',
          message: 'Tidak ditemukan riwayat kunjungan dengan NIK tersebut. Silakan lengkapi data pasien baru.'
        });
      }
    } catch (err: any) {
      console.error('Gagal mencari NIK pasien:', err);
      setModalNotif({
        show: true,
        type: 'error',
        title: 'Pencarian Gagal',
        message: 'Terjadi kendala saat mencari data: ' + err.message
      });
    } finally {
      setSearchingNik(false);
    }
  };

  const loadSavedBillings = async () => {
    setFetchingList(true);
    try {
      const { data: headers, error: headerErr } = await supabase
        .from('ranap_billing_header')
        .select('*')
        .order('created_at', { ascending: false });

      if (headerErr) throw headerErr;

      if (headers) {
        const { data: items } = await supabase
          .from('ranap_billing_items')
          .select('no_reg, jumlah_total, ditanggung_pihak3, selisih_bayar');

        const formatted = headers.map(h => {
          const matchingItems = items?.filter(i => i.no_reg === h.no_reg) || [];
          const total_biaya = matchingItems.reduce((acc, curr) => acc + (curr.jumlah_total || 0), 0);
          const total_ditanggung = matchingItems.reduce((acc, curr) => acc + (curr.ditanggung_pihak3 || 0), 0);
          const total_selisih = matchingItems.reduce((acc, curr) => acc + (curr.selisih_bayar || 0), 0);

          return {
            ...h,
            catatan_admin: h.catatan_admin || h.alasan_penolakan || '',
            total_biaya,
            total_ditanggung,
            total_selisih
          };
        });

        setSavedBillings(formatted);
        setSelectedBillingIds(formatted.map(b => b.no_reg));
      }
    } catch (err) {
      console.error('Gagal memuat daftar tagihan:', err);
    } finally {
      setFetchingList(false);
    }
  };

  const handleOpenDetailPasien = async (billing: SavedBillingHeader) => {
    setActiveDetailPasien(billing);
    setShowDetailModal(true);
    setLoadingDetail(true);

    try {
      const { data: fetchedItems, error } = await supabase
        .from('ranap_billing_items')
        .select('*')
        .eq('no_reg', billing.no_reg);

      if (error) throw error;
      setActiveDetailItems(fetchedItems || []);
    } catch (err) {
      console.error('Gagal mengambil rincian item:', err);
      setActiveDetailItems([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isFormLocked) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isFormLocked || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setPatientData(prev => ({
          ...prev,
          signatureBase64: canvas.toDataURL()
        }));
      }
    }
  };

  const clearSignature = () => {
    if (isFormLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setPatientData(prev => ({ ...prev, signatureBase64: '' }));
  };

  const [billingItems, setBillingItems] = useState<BillingItem[]>([
    { id: '1', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Super VIP', volume: 0, tarif: 0, isCovered: false },
    { id: '2', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'VIP', volume: 0, tarif: 0, isCovered: false },
    { id: '3', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas Utama', volume: 0, tarif: 0, isCovered: false },
    { id: '4', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas III', volume: 0, tarif: 0, isCovered: false },
    { id: '5', kategori: 'II. MAKAN', uraian: 'Makan Pasien Ranap', volume: 0, tarif: 0, isCovered: false },
    { id: '6', kategori: 'III. VISIT', uraian: '1. Visit Dokter Spesialis', volume: 0, tarif: 0, isCovered: false },
    { id: '7', kategori: 'III. VISIT', uraian: '2. Visit / Visite Lainnya', volume: 0, tarif: 0, isCovered: false },
    { id: '8', kategori: 'IV. OBAT-OBATAN', uraian: 'a. Injeksi & Infus', volume: 0, tarif: 0, isCovered: false },
    { id: '9', kategori: 'IV. OBAT-OBATAN', uraian: 'b. Tablet / Oral', volume: 0, tarif: 0, isCovered: false },
    { id: '10', kategori: 'V. OPERASI', uraian: '1. Operasi Kecil', volume: 0, tarif: 0, isCovered: false },
    { id: '11', kategori: 'V. OPERASI', uraian: '2. Operasi Sedang', volume: 0, tarif: 0, isCovered: false },
    { id: '12', kategori: 'V. OPERASI', uraian: '3. Operasi Besar', volume: 0, tarif: 0, isCovered: false },
    { id: '13', kategori: 'V. OPERASI', uraian: '4. Curratage', volume: 0, tarif: 0, isCovered: false },
    { id: '14', kategori: 'V. OPERASI', uraian: '5. Partus Normal', volume: 0, tarif: 0, isCovered: false },
    { id: '15', kategori: 'V. OPERASI', uraian: '6. Partus Sulit', volume: 0, tarif: 0, isCovered: false },
    { id: '16', kategori: 'V. OPERASI', uraian: '7. Lainnya - a', volume: 0, tarif: 0, isCovered: false },
    { id: '17', kategori: 'V. OPERASI', uraian: '7. Lainnya - b', volume: 0, tarif: 0, isCovered: false },
    { id: '18', kategori: 'V. OPERASI', uraian: '7. Lainnya - c', volume: 0, tarif: 0, isCovered: false },
    { id: '19', kategori: 'VI. PENUNJANG MEDIK', uraian: 'a. Laboratorium', volume: 0, tarif: 0, isCovered: false },
    { id: '20', kategori: 'VI. PENUNJANG MEDIK', uraian: 'b. Pemeriksaan Penunjang b', volume: 0, tarif: 0, isCovered: false },
    { id: '21', kategori: 'VI. PENUNJANG MEDIK', uraian: 'c. Pemeriksaan Penunjang c', volume: 0, tarif: 0, isCovered: false },
    { id: '22', kategori: 'VI. PENUNJANG MEDIK', uraian: 'd. USG', volume: 0, tarif: 0, isCovered: false },
    { id: '23', kategori: 'VI. PENUNJANG MEDIK', uraian: 'e. EKG', volume: 0, tarif: 0, isCovered: false },
    { id: '24', kategori: 'VI. PENUNJANG MEDIK', uraian: 'f. Rontgen', volume: 0, tarif: 0, isCovered: false },
    { id: '25', kategori: 'VII. LAIN LAIN', uraian: 'a. Visite Apoteker', volume: 0, tarif: 0, isCovered: false },
    { id: '26', kategori: 'VII. LAIN LAIN', uraian: 'b. Konsultasi Gizi', volume: 0, tarif: 0, isCovered: false },
    { id: '27', kategori: 'VII. LAIN LAIN', uraian: 'c. Ambulance', volume: 0, tarif: 0, isCovered: false },
    { id: '28', kategori: 'VII. LAIN LAIN', uraian: 'd. ADM', volume: 0, tarif: 0, isCovered: false },
    { id: '29', kategori: 'VII. LAIN LAIN', uraian: 'e. Tindakan / Biaya Lainnya', volume: 0, tarif: 0, isCovered: false }
  ]);

  const handleApplyPreset = (type: 'umum' | 'bpjs') => {
    if (isFormLocked) return;
    const isBpjs = type === 'bpjs';
    setPatientData(prev => ({
      ...prev,
      jenisPenjaminan: isBpjs ? 'BPJS KESEHATAN' : 'UMUM / MANDIRI',
      metodePembayaran: isBpjs ? 'Non-Tunai / Penjaminan' : 'Tunai / Cash'
    }));

    setBillingItems(prev => prev.map(item => ({ ...item, isCovered: isBpjs })));
  };

  const handlePenjaminanSelectChange = (val: string) => {
    if (isFormLocked) return;
    const isBpjs = val === 'BPJS KESEHATAN';
    setPatientData(prev => ({
      ...prev,
      jenisPenjaminan: val,
      metodePembayaran: isBpjs ? 'Non-Tunai / Penjaminan' : 'Tunai / Cash'
    }));

    setBillingItems(prev => prev.map(item => ({ ...item, isCovered: isBpjs })));
  };

  const handleItemChange = (id: string, field: 'uraian' | 'volume' | 'tarif' | 'isCovered', value: any) => {
    if (isFormLocked) return;
    setBillingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleAddRow = (kategoriTarget: string) => {
    if (isFormLocked) return;
    const newRow: BillingItem = {
      id: 'custom-' + Math.random().toString(36).substring(2, 9),
      kategori: kategoriTarget,
      uraian: 'Tindakan / Layanan Tambahan Baru',
      volume: 0,
      tarif: 0,
      isCovered: patientData.jenisPenjaminan === 'BPJS KESEHATAN'
    };
    setBillingItems(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (isFormLocked) return;
    setBillingItems(prev => prev.filter(item => item.id !== id));
  };

  const totalJumlah = billingItems.reduce((acc, item) => acc + (item.volume * item.tarif), 0);
  const totalDitanggung = billingItems.reduce((acc, item) => {
    const totalItem = item.volume * item.tarif;
    return acc + (item.isCovered ? totalItem : 0);
  }, 0);
  const totalSelisih = totalJumlah - totalDitanggung;

  const hitungLamaRawat = () => {
    if (!patientData.masukTgl || !patientData.keluarTgl) return 0;
    const tgl1 = new Date(patientData.masukTgl);
    const tgl2 = new Date(patientData.keluarTgl);
    const diffTime = tgl2.getTime() - tgl1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const handleSubmitToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormLocked) {
      setModalNotif({
        show: true,
        type: 'warning',
        title: 'Akses Dibatasi',
        message: 'Data tagihan ini sudah dikirim dan terkunci. Anda tidak dapat mengubah data yang sudah dikirim. Silakan buat pengajuan baru jika ada penambahan.'
      });
      return;
    }

    if (!patientData.namaPasien) {
      setModalNotif({
        show: true,
        type: 'warning',
        title: 'Data Belum Lengkap',
        message: 'Nama pasien wajib diisi sebelum mengirim tagihan!'
      });
      return;
    }

    setLoading(true);
    try {
      const { error: headerError } = await supabase
        .from('ranap_billing_header')
        .insert({
          no_reg: patientData.noReg,
          jenis_penjaminan: patientData.jenisPenjaminan,
          metode_pembayaran: patientData.metodePembayaran,
          nama_pasien: patientData.namaPasien,
          nik_pasien: patientData.nikPasien,
          umur: patientData.umur,
          alamat: patientData.alamat,
          diagnosa: patientData.diagnosa,
          ruang: patientData.ruangPerawatan,
          no_kartu_bpjs: patientData.noBpjs,
          no_sep_bpjs: patientData.noSep,
          masuk_tgl: patientData.masukTgl ? new Date(patientData.masukTgl).toISOString() : null,
          keluar_tgl: patientData.keluarTgl ? new Date(patientData.keluarTgl).toISOString() : null,
          dokter_merawat: patientData.dokterMerawat,
          kepala_ruangan: patientData.kepalaRuangan,
          bendahara_penerima: patientData.bendahara,
          petugas_email: patientData.petugasEmail,
          ttd_petugas_base64: patientData.signatureBase64,
          status_verifikasi: 'PENDING_VERIFIKASI'
        });

      if (headerError) throw headerError;

      const itemsToInsert = billingItems
        .filter(item => item.volume > 0 || item.tarif > 0)
        .map(item => {
          const jumlah_total = item.volume * item.tarif;
          const ditanggung_pihak3 = item.isCovered ? jumlah_total : 0;
          const selisih_bayar = jumlah_total - ditanggung_pihak3;

          return {
            no_reg: patientData.noReg,
            kategori_biaya: item.kategori,
            nama_item: item.uraian,
            volume: item.volume,
            tarif_satuan: item.tarif,
            jumlah_total,
            ditanggung_pihak3,
            selisih_bayar
          };
        });

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('ranap_billing_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      loadSavedBillings();
      setPatientData(prev => ({ ...prev, statusVerifikasi: 'PENDING_VERIFIKASI' }));

      setModalNotif({
        show: true,
        type: 'success',
        title: 'Pengajuan Berhasil Dikirim!',
        message: 'Data rincian biaya rawat inap baru telah sukses dikirim ke admin dan sekarang dikunci secara permanen.',
        showPrintOption: true
      });

    } catch (err: any) {
      console.error('Gagal mengajukan tagihan:', err);
      setModalNotif({
        show: true,
        type: 'error',
        title: 'Gagal Menyimpan Data',
        message: 'Terjadi kesalahan sistem: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const lamaHari = hitungLamaRawat();

  const filteredBillings = savedBillings.filter(b => {
    const matchSearch = 
      b.nama_pasien.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      b.no_reg.toLowerCase().includes(searchKeyword.toLowerCase());
     
    const matchFilter = 
      filterPenjaminan === 'ALL' || 
      b.jenis_penjaminan === filterPenjaminan;

    const matchStatus = 
      filterStatus === 'ALL' || 
      (b.status_verifikasi || 'PENDING_VERIFIKASI') === filterStatus;

    return matchSearch && matchFilter && matchStatus;
  });

  const toggleSelectAll = () => {
    if (selectedBillingIds.length === filteredBillings.length) {
      setSelectedBillingIds([]);
    } else {
      setSelectedBillingIds(filteredBillings.map(b => b.no_reg));
    }
  };

  const toggleSelectOne = (noReg: string) => {
    if (selectedBillingIds.includes(noReg)) {
      setSelectedBillingIds(selectedBillingIds.filter(id => id !== noReg));
    } else {
      setSelectedBillingIds([...selectedBillingIds, noReg]);
    }
  };

  const totalBiayaTerpilih = filteredBillings.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const totalTunaiTerpilih = filteredBillings
    .filter(b => b.metode_pembayaran?.toLowerCase().includes('tunai') || b.metode_pembayaran?.toLowerCase().includes('cash') || !b.metode_pembayaran)
    .reduce((acc, curr) => acc + (curr.total_selisih || curr.total_biaya || 0), 0);
  const totalOnlineTerpilih = filteredBillings
    .filter(b => b.metode_pembayaran?.toLowerCase().includes('transfer') || b.metode_pembayaran?.toLowerCase().includes('qris'))
    .reduce((acc, curr) => acc + (curr.total_selisih || 0), 0);

  const renderStatusBadge = (status?: string) => {
    const st = status || 'PENDING_VERIFIKASI';
    if (st === 'VERIFIED' || st === 'VERIFIED_ADMIN') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Terverifikasi</span>
        </span>
      );
    } else if (st === 'REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 uppercase">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak Admin</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase">
          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
          <span>Menunggu Verifikasi</span>
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans print:bg-white relative">
       
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          input, select {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            font-size: 11px !important;
            color: black !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 4px 6px !important;
          }
        }
      `}</style>

      {/* DETAIL RIWAYAT PASIEN SPESIFIK (MODAL) */}
      {showDetailModal && activeDetailPasien && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
             
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-black uppercase tracking-wider">Detail Riwayat Tagihan Pasien: {activeDetailPasien.nama_pasien}</h3>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 bg-emerald-900 hover:bg-rose-600 text-emerald-200 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
               
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">No. Registrasi / RM</span>
                  <strong className="text-slate-900 font-mono">{activeDetailPasien.no_reg}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">NIK Pasien</span>
                  <strong className="text-slate-900">{activeDetailPasien.nik_pasien || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Ruangan Rawat</span>
                  <strong className="text-slate-900">{activeDetailPasien.ruang || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Status Verifikasi</span>
                  <div className="mt-0.5">{renderStatusBadge(activeDetailPasien.status_verifikasi)}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                  Rincian Layanan & Tindakan Medis
                </div>
                {loadingDetail ? (
                  <div className="p-8 text-center text-slate-500 text-xs">Memuat rincian item biaya...</div>
                ) : activeDetailItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">Tidak ada rincian item tercatat.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                        <th className="p-2.5">Kategori</th>
                        <th className="p-2.5">Uraian / Tindakan</th>
                        <th className="p-2.5 text-center">Volume</th>
                        <th className="p-2.5 text-right">Tarif Satuan</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Ditanggung Pihak 3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDetailItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-600 font-medium">{item.kategori_biaya}</td>
                          <td className="p-2.5 font-bold text-slate-900">{item.nama_item}</td>
                          <td className="p-2.5 text-center font-mono">{item.volume}</td>
                          <td className="p-2.5 text-right font-mono">Rp {formatNumber(item.tarif_satuan)}</td>
                          <td className="p-2.5 text-right font-mono font-bold">Rp {formatNumber(item.jumlah_total)}</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">Rp {formatNumber(item.ditanggung_pihak3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

          </div>

          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Dicatat oleh: <strong className="text-slate-800">{activeDetailPasien.bendahara_penerima || 'Petugas Kasir'}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

        </div>
      )}

      {modalNotif.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all animate-scale-up">
             
            <div className={`p-6 flex flex-col items-center text-center space-y-3 ${
              modalNotif.type === 'success' ? 'bg-emerald-50/80' :
              modalNotif.type === 'error' ? 'bg-rose-50/80' :
              modalNotif.type === 'warning' ? 'bg-amber-50/80' : 'bg-sky-50/80'
            }`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                modalNotif.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/30' :
                modalNotif.type === 'error' ? 'bg-rose-600 text-white shadow-rose-600/30' :
                modalNotif.type === 'warning' ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-sky-600 text-white shadow-sky-600/30'
              }`}>
                {modalNotif.type === 'success' && <CheckCircle2 className="w-9 h-9" />}
                {modalNotif.type === 'error' && <AlertCircle className="w-9 h-9" />}
                {modalNotif.type === 'warning' && <AlertTriangle className="w-9 h-9" />}
                {modalNotif.type === 'info' && <Info className="w-9 h-9" />}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 tracking-wide">
                  {modalNotif.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {modalNotif.message}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end space-x-2">
              {modalNotif.showPrintOption && (
                <button
                  onClick={() => {
                    setActiveTab('input');
                    setModalNotif({ ...modalNotif, show: false });
                    setTimeout(() => window.print(), 300);
                  }}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 cursor-pointer"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Cetak Formulir</span>
                </button>
              )}

              <button
                onClick={() => {
                  setModalNotif({ ...modalNotif, show: false });
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Tutup / Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="print:hidden">
        <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Input Perincian Biaya Rawat Inap (Kasir)" />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
         
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Menu Kasir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPatientData(prev => ({
                  ...prev,
                  noReg: 'REG-RANAP-' + Date.now().toString().slice(-6),
                  jenisPenjaminan: 'UMUM / MANDIRI',
                  metodePembayaran: 'Tunai / Cash',
                  namaPasien: '',
                  nikPasien: '',
                  umur: '',
                  alamat: '',
                  diagnosa: '',
                  ruangPerawatan: 'VIP Melati',
                  noBpjs: '',
                  noSep: '',
                  masukTgl: new Date().toISOString().split('T')[0],
                  keluarTgl: new Date().toISOString().split('T')[0],
                  dokterMerawat: '',
                  kepalaRuangan: '',
                  signatureBase64: '',
                  statusVerifikasi: 'NEW',
                  catatanAdmin: ''
                }));
                setBillingItems(prev => prev.map(item => ({ ...item, volume: 0, tarif: 0, isCovered: false })));
                clearSignature();
                setActiveTab('input');
              }}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Perincian Baru</span>
            </button>
          </div>
           
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('input');
                setTimeout(() => window.print(), 150);
              }}
              className="flex items-center space-x-1.5 bg-sky-700 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Formulir</span>
            </button>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md text-xs font-black border border-emerald-200 uppercase">
              {patientData.bendahara}
            </span>
          </div>
        </div>

        {/* ========================================== */}
        {/* SISTEM TAB NAVIGASI UTAMA (INPUT VS RIWAYAT) */}
        {/* ========================================== */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeTab === 'input'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Form Input Perincian Rawat Inap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Daftar Riwayat & Akumulasi Tagihan ({savedBillings.length})</span>
          </button>
        </div>

        {/* KONTEN TAB 2: DAFTAR RIWAYAT & AKUMULASI (TERPISAH) */}
        {activeTab === 'riwayat' && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-fade-in print:hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Daftar Riwayat Tagihan Rawat Inap & Akumulasi Pembayaran</h3>
              </div>
              <button
                onClick={loadSavedBillings}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingList ? 'animate-spin' : ''}`} />
                <span>Muat Ulang Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                  <span>Total Sesuai Filter ({filteredBillings.length} Pasien)</span>
                  <UsersIconMini className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-black text-emerald-400">Rp {formatNumber(totalBiayaTerpilih)}</span>
                  <p className="text-[10px] text-slate-400 mt-1">Akumulasi total tagihan dari filter aktif</p>
                </div>
              </div>

              <div className="bg-teal-800 text-white p-5 rounded-2xl shadow-md border border-teal-700 flex flex-col justify-between">
                <div className="flex items-center justify-between text-teal-200 text-xs font-bold uppercase">
                  <span>Penerimaan Tunai / Cash</span>
                  <span className="text-xs">💵</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-black text-white">Rp {formatNumber(totalTunaiTerpilih)}</span>
                  <p className="text-[10px] text-teal-200 mt-1">Pembayaran fisik langsung di kasir</p>
                </div>
              </div>

              <div className="bg-cyan-900 text-white p-5 rounded-2xl shadow-md border border-cyan-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-cyan-200 text-xs font-bold uppercase">
                  <span>Penerimaan Online / QRIS</span>
                  <span className="text-xs">💳</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-black text-white">Rp {formatNumber(totalOnlineTerpilih)}</span>
                  <p className="text-[10px] text-cyan-200 mt-1">Transfer bank & rekening RSUD</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari RM / Nama Pasien..." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <select 
                  value={filterPenjaminan}
                  onChange={(e) => setFilterPenjaminan(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">Semua Penjaminan</option>
                  <option value="UMUM / MANDIRI">UMUM / MANDIRI</option>
                  <option value="BPJS KESEHATAN">BPJS KESEHATAN</option>
                </select>

                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">Semua Status Bayar</option>
                  <option value="PENDING_VERIFIKASI">Menunggu Verifikasi</option>
                  <option value="VERIFIED">Terverifikasi Admin</option>
                  <option value="REJECTED">Ditolak Admin</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-3 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={selectedBillingIds.length === filteredBillings.length && filteredBillings.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">No. RM / Reg</th>
                    <th className="p-3">Nama Pasien</th>
                    <th className="p-3">Ruangan</th>
                    <th className="p-3">Penjaminan</th>
                    <th className="p-3 text-center">Status Verifikasi</th>
                    <th className="p-3 text-right">Total Biaya</th>
                    <th className="p-3 text-right">Ditanggung BPJS</th>
                    <th className="p-3 text-right">Wajib Bayar (Umum)</th>
                    <th className="p-3 text-center">Aksi (Lihat Detail)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {fetchingList ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">Memuat data tagihan...</td>
                    </tr>
                  ) : filteredBillings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">Tidak ada data tagihan yang cocok.</td>
                    </tr>
                  ) : (
                    filteredBillings.map((b) => {
                      const isChecked = selectedBillingIds.includes(b.no_reg);
                      return (
                        <tr key={b.no_reg} className={`hover:bg-slate-50 transition ${isChecked ? 'bg-emerald-50/40' : ''}`}>
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(b.no_reg)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{b.no_reg}</td>
                          <td className="p-3 font-bold text-slate-800 uppercase">{b.nama_pasien}</td>
                          <td className="p-3 text-slate-600">{b.ruang || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                              b.jenis_penjaminan === 'BPJS KESEHATAN'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-sky-100 text-sky-800 border-sky-300'
                            }`}>
                              {b.jenis_penjaminan}
                            </span>
                          </td>
                          <td className="p-3 text-center">{renderStatusBadge(b.status_verifikasi)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">Rp {formatNumber(b.total_biaya || 0)}</td>
                          <td className="p-3 text-right font-mono text-emerald-700 font-semibold">Rp {formatNumber(b.total_ditanggung || 0)}</td>
                          <td className="p-3 text-right font-mono text-rose-700 font-bold">Rp {formatNumber(b.total_selisih || 0)}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenDetailPasien(b)}
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer"
                                title="Lihat Detail Riwayat Pasien"
                              >
                                <Eye className="w-4 h-4 text-emerald-700" />
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTab('input');
                                  setTimeout(() => window.print(), 150);
                                }}
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition cursor-pointer"
                                title="Cetak Kuitansi"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
            <div className="text-xs font-bold text-slate-600 pt-1">
              Ditampilkan: <strong className="text-emerald-700">{filteredBillings.length}</strong> pasien
            </div>
          </div>
        )}

        {/* KONTEN TAB 1: FORMULIR INPUT RAWAT INAP */}
        {activeTab === 'input' && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-fade-in">
             
            {isFormLocked ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-sm print:hidden">
                <div className="flex items-center space-x-3">
                  <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 animate-bounce" />
                  <div>
                    <span className="font-black text-xs uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                      DOKUMEN TERKUNCI (TELAH DIKIRIM KE ADMIN)
                    </span>
                    <p className="text-xs font-medium text-amber-800 mt-1">
                      Data ini sedang menunggu verifikasi atau sudah diverifikasi. Anda hanya dapat melihat atau mencetaknya.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-300">
                  Status: Menunggu Verifikasi
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center space-x-3 text-emerald-900 shadow-sm print:hidden">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-black text-xs uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                    FORMULIR SIAP DIISI / INPUT BARU
                  </span>
                  <p className="text-xs font-medium text-emerald-800 mt-1">
                    Masukkan NIK untuk menarik data pasien lama secara otomatis atau isi rincian baru untuk kunjungan kali ini.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pb-6 border-b-2 border-slate-800 gap-4">
              <div className="flex-shrink-0 w-20 h-24 relative flex items-center justify-center">
                {!logoKerinciErr ? (
                  <img 
                    src="/logo-kerinci.png" 
                    alt="Logo Kabupaten Kerinci" 
                    onError={() => setLogoKerinciErr(true)}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-20 bg-amber-50 border-2 border-amber-400 text-amber-900 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black text-center p-1 shadow-sm">
                    <span className="text-xs font-extrabold text-amber-600">🏛️</span>
                    <span className="leading-tight">PEMKAB</span>
                    <span className="leading-tight">KERINCI</span>
                  </div>
                )}
              </div>

              <div className="text-center flex-1 space-y-0.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  PEMERINTAH KABUPATEN KERINCI — DINAS KESEHATAN
                </h2>
                <h1 className="text-sm sm:text-lg font-black text-emerald-800 tracking-wider uppercase">
                  RSUD KELAS D BUKIT KERMAN
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Website: https://rsudbukitkerman.kerincikab.go.id | Email: rsubukitkerman@gmail.com
                </p>
                <div className="pt-2">
                  <span className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-sm print:bg-transparent print:text-black print:border print:border-black">
                    PERINCIAN BIAYA PELAYANAN RAWAT INAP
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 w-20 h-24 relative flex items-center justify-center">
                {!logoRsudErr ? (
                  <img 
                    src="/logo-rsud.jpeg" 
                    alt="Logo RSUD Bukit Kerman" 
                    onError={() => setLogoRsudErr(true)}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-20 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black text-center p-1 shadow-sm">
                    <span className="text-xs font-extrabold text-emerald-600">🏥</span>
                    <span className="leading-tight">RSUD</span>
                    <span className="leading-tight">KERMAN</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitToDatabase} className="space-y-6">
              <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors print:hidden ${
                patientData.jenisPenjaminan === 'BPJS KESEHATAN' 
                  ? 'bg-emerald-500/10 border-emerald-300' 
                  : 'bg-sky-500/10 border-sky-300'
              }`}>
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="block text-[11px] text-slate-500 font-normal">Kategori Pasien Aktif:</span>
                    <span className="text-xs font-black uppercase text-slate-900">{patientData.jenisPenjaminan}</span>
                  </div>
                </div>

                {!isFormLocked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('umum')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer border ${
                        patientData.jenisPenjaminan === 'UMUM / MANDIRI'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Pasien Umum Standar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('bpjs')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer border ${
                        patientData.jenisPenjaminan === 'BPJS KESEHATAN'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      Pasien BPJS Kesehatan
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 print:bg-transparent print:border-none print:p-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Masuk</label>
                  <input 
                    type="date" 
                    value={patientData.masukTgl}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, masukTgl: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Keluar</label>
                  <input 
                    type="date" 
                    value={patientData.keluarTgl}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, keluarTgl: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  />
                </div>

                <div className="flex flex-col justify-center bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-sm print:border-none print:p-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600 print:hidden" /> Lama Rawat (LOS):
                  </span>
                  <span className="text-sm font-black text-emerald-800 print:text-black">
                    {lamaHari} Hari / Malam
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Penjaminan</label>
                  <select
                    value={patientData.jenisPenjaminan}
                    disabled={isFormLocked}
                    onChange={(e) => handlePenjaminanSelectChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-900 bg-white disabled:bg-slate-100"
                  >
                    <option value="UMUM / MANDIRI">UMUM / MANDIRI</option>
                    <option value="BPJS KESEHATAN">BPJS KESEHATAN</option>
                    <option value="ASURANSI SWASTA / JAMKESDA">ASURANSI SWASTA / JAMKESDA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={patientData.metodePembayaran}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, metodePembayaran: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  >
                    <option value="Tunai / Cash">Tunai / Cash</option>
                    <option value="Transfer Bank / QRIS">Transfer Bank / QRIS</option>
                    <option value="Non-Tunai / Penjaminan">Non-Tunai / Penjaminan BPJS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 print:bg-transparent print:border-none print:p-0">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">No. Registrasi / RM</label>
                  <input 
                    type="text" 
                    value={patientData.noReg}
                    disabled={true}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-slate-100 text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">NIK Pasien (Cari Riwayat)</label>
                  <div className="flex space-x-1">
                    <input 
                      type="text" 
                      value={patientData.nikPasien}
                      disabled={isFormLocked}
                      placeholder="Nomor NIK..."
                      onChange={(e) => setPatientData({...patientData, nikPasien: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                    />
                    {!isFormLocked && (
                      <button
                        type="button"
                        onClick={handleCariPasienLama}
                        disabled={searchingNik}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center flex-shrink-0 cursor-pointer"
                        title="Cari pasien berdasarkan NIK"
                      >
                        <UserSearch className={`w-4 h-4 ${searchingNik ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pasien</label>
                  <input 
                    type="text" 
                    value={patientData.namaPasien}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, namaPasien: e.target.value})}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white uppercase disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Umur</label>
                  <input 
                    type="text" 
                    value={patientData.umur}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, umur: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ruang / Kelas Perawatan</label>
                  <input 
                    type="text" 
                    value={patientData.ruangPerawatan}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, ruangPerawatan: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  />
                </div>

                {patientData.jenisPenjaminan === 'BPJS KESEHATAN' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-emerald-700 mb-1">No. Kartu BPJS</label>
                      <input 
                        type="text" 
                        value={patientData.noBpjs}
                        disabled={isFormLocked}
                        onChange={(e) => setPatientData({...patientData, noBpjs: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-medium bg-emerald-50/50 disabled:bg-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-emerald-700 mb-1">No. SEP BPJS</label>
                      <input 
                        type="text" 
                        value={patientData.noSep}
                        disabled={isFormLocked}
                        onChange={(e) => setPatientData({...patientData, noSep: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-bold text-emerald-900 bg-emerald-50/50 disabled:bg-slate-100"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Diagnosa Penyakit / Medis</label>
                    <input 
                      type="text" 
                      value={patientData.diagnosa}
                      disabled={isFormLocked}
                      onChange={(e) => setPatientData({...patientData, diagnosa: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                    />
                  </div>
                )}

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Alamat Lengkap Pasien</label>
                  <input 
                    type="text" 
                    value={patientData.alamat}
                    disabled={isFormLocked}
                    onChange={(e) => setPatientData({...patientData, alamat: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-2xl shadow-sm print:border-none print:shadow-none">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white uppercase font-bold text-[11px] tracking-wider print:bg-slate-200 print:text-black">
                      <th className="p-3">Uraian Biaya / Layanan Medis</th>
                      <th className="p-3 text-center w-24">Vol / Hari</th>
                      <th className="p-3 text-right w-36">Tarif Satuan (Rp)</th>
                      <th className="p-3 text-right w-36">Jumlah Total</th>
                      <th className="p-3 text-center w-36">Ditanggung BPJS?</th>
                      <th className="p-3 text-right w-36">Wajib Bayar (Umum)</th>
                      <th className="p-3 text-center w-12 print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {CATEGORIES.map((category) => {
                      const categoryItems = billingItems.filter(item => item.kategori === category);

                      return (
                        <React.Fragment key={category}>
                          <tr className="bg-emerald-50/90 border-t-2 border-emerald-600 print:bg-slate-100 print:border-black">
                            <td colSpan={7} className="p-2.5 font-black text-emerald-900 tracking-wide text-xs flex items-center justify-between print:text-black">
                              <span>{category}</span>
                              {!isFormLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleAddRow(category)}
                                  className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded-lg transition shadow-sm cursor-pointer font-bold print:hidden"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tambah Item</span>
                                </button>
                              )}
                            </td>
                          </tr>

                          {categoryItems.map((item) => {
                            const subTotal = item.volume * item.tarif;
                            const ditanggung = item.isCovered ? subTotal : 0;
                            const selisih = subTotal - ditanggung;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium text-slate-800 pl-6 border-l border-slate-100 print:border-black">
                                  <input 
                                    type="text"
                                    value={item.uraian}
                                    disabled={isFormLocked}
                                    onChange={(e) => handleItemChange(item.id, 'uraian', e.target.value)}
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 disabled:bg-slate-50"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <input 
                                    type="number" 
                                    value={item.volume}
                                    disabled={isFormLocked}
                                    onChange={(e) => handleItemChange(item.id, 'volume', parseFloat(e.target.value) || 0)}
                                    className="w-16 text-center px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono disabled:bg-slate-50"
                                  />
                                </td>
                                 
                                <td className="p-3 text-right">
                                  <input 
                                    type="text" 
                                    value={formatNumber(item.tarif)}
                                    disabled={isFormLocked}
                                    onChange={(e) => handleItemChange(item.id, 'tarif', parseNumber(e.target.value))}
                                    className="w-32 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono font-medium disabled:bg-slate-50"
                                  />
                                </td>

                                <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                  Rp {formatNumber(subTotal)}
                                </td>

                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    disabled={isFormLocked}
                                    onClick={() => handleItemChange(item.id, 'isCovered', !item.isCovered)}
                                    className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold transition print:border-none print:p-0 ${
                                      item.isCovered 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                  >
                                    <span className="print:hidden">{item.isCovered ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}</span>
                                    <span>{item.isCovered ? 'BPJS' : 'Umum'}</span>
                                  </button>
                                </td>

                                <td className="p-3 text-right font-bold font-mono text-rose-700 print:text-black">
                                  Rp {formatNumber(selisih)}
                                </td>

                                <td className="p-3 text-center print:hidden">
                                  {!isFormLocked && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRow(item.id)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                      title="Hapus baris"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-sm border-t-4 border-emerald-500 print:bg-slate-200 print:text-black">
                      <td colSpan={3} className="p-3.5 text-right uppercase tracking-wider">JUMLAH KESELURUHAN:</td>
                      <td className="p-3.5 text-right font-mono">Rp {formatNumber(totalJumlah)}</td>
                      <td className="p-3.5 text-right font-mono">Rp {formatNumber(totalDitanggung)}</td>
                      <td className="p-3.5 text-right font-mono">Rp {formatNumber(totalSelisih)}</td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6 print:bg-white print:border-none print:p-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dokter Yang Merawat</label>
                    <input 
                      type="text" 
                      value={patientData.dokterMerawat}
                      disabled={isFormLocked}
                      onChange={(e) => setPatientData({...patientData, dokterMerawat: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kepala Ruangan</label>
                    <input 
                      type="text" 
                      value={patientData.kepalaRuangan}
                      disabled={isFormLocked}
                      onChange={(e) => setPatientData({...patientData, kepalaRuangan: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bendahara / Penerima (Petugas Kasir)</label>
                    <input 
                      type="text" 
                      value={patientData.bendahara}
                      disabled={true}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-bold text-emerald-900 bg-emerald-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-center pt-8 text-xs">
                  <div>
                    <p className="font-bold text-slate-700 mb-16">Dokter Yang Merawat</p>
                    <p className="font-bold underline uppercase">{patientData.dokterMerawat || '( .......................................... )'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 mb-16">Kepala Ruangan</p>
                    <p className="font-bold underline uppercase">{patientData.kepalaRuangan || '( .......................................... )'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 mb-2">Bukit Kerman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold text-slate-700 mb-12">Bendahara Yang Menerima</p>
                     
                    {patientData.signatureBase64 ? (
                      <div className="flex justify-center mb-1">
                        <img src={patientData.signatureBase64} alt="Tanda Tangan Petugas" className="h-14 object-contain" />
                      </div>
                    ) : (
                      <div className="h-14 print:hidden"></div>
                    )}
                     
                    <p className="font-bold underline uppercase">{patientData.bendahara}</p>
                  </div>
                </div>

                {!isFormLocked && (
                  <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4 border-t border-slate-200">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Petugas Penginput Data (Penanggung Jawab Sesi)</span>
                      </div>

                      <div className="space-y-1 pl-6 border-l-2 border-emerald-500">
                        <p className="text-xs text-slate-500">
                          Nama Petugas: <span className="font-bold text-slate-900 text-sm">{patientData.bendahara}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          NIP / ID: <span className="font-bold font-mono text-slate-900">{patientData.petugasNip || '-'}</span>
                        </p>
                        <p className="text-xs text-emerald-600 font-bold uppercase mt-1">
                          Status Akses: Verified Kasir
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">Tanda Tangan Petugas Penginput</label>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 text-xs font-bold cursor-pointer transition"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Bersihkan TTD</span>
                        </button>
                      </div>

                      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner flex items-center justify-center">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 cursor-crosshair touch-none"
                        />
                        {!hasSignature && (
                          <span className="absolute text-slate-400 text-xs pointer-events-none font-medium">
                            Goreskan tanda tangan petugas di sini
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 print:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Mengirim...' : 'Kirim Perincian Baru Ke Admin'}</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

      <div className="print:hidden">
        <KasirFooter />
      </div>

    </div>
  );
}

function UsersIconMini(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}