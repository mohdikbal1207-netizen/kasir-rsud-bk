'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Printer, Save, Calculator, Stethoscope, Search, UserCheck, 
  History, FileText, Eye, AlertCircle, RefreshCw, ArrowLeft, X, FileSpreadsheet, Calendar, User, Banknote, Zap, CheckCircle2, ShieldCheck, Info, Download, Upload, Plus, Minus, Trash2, Copy, Receipt, Flame, ShieldAlert, CheckCircle
} from 'lucide-react';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';
import { supabase } from '@/lib/supabase'; // Impor client Supabase

interface ItemTindakan {
  id: string;
  nama: string;
  tarif: number;
  kategori: string;
}

interface TagihanRecord {
  id: string;
  noRm: string;
  namaPasien: string;
  ttl: string;
  alamat: string;
  tanggal: string;
  dokter: string;
  triase: 'Merah' | 'Kuning' | 'Hijau';
  items: { [key: string]: number };
  totalTarif: number;
  status: 'Menunggu Verifikasi' | 'Disetujui' | 'Direvisi';
  metodeBayar: 'Tunai / Cash' | 'Online / QRIS';
  statusBayar: 'Lunas' | 'Belum Bayar';
  penjaminan: 'Umum' | 'BPJS';
}

const daftarTindakanIGD: ItemTindakan[] = [
  { id: '1', nama: 'Jahit Luka - Kecil (1-5 jahitan)', tarif: 100000, kategori: 'Bedah Minor' },
  { id: '2', nama: 'Jahit Luka - Sedang (6-15 jahitan)', tarif: 150000, kategori: 'Bedah Minor' },
  { id: '3', nama: 'Jahit Luka - Besar (15-20 jahitan)', tarif: 200000, kategori: 'Bedah Minor' },
  { id: '4', nama: 'Jahit Luka - Sangat Besar/Penyulit (>20 jahitan)', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '5', nama: 'Ekstraksi kuku', tarif: 150000, kategori: 'Bedah Minor' },
  { id: '6', nama: 'Incisi Abses', tarif: 160000, kategori: 'Bedah Minor' },
  { id: '7', nama: 'Angkat Peluru/gram', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '8', nama: 'Ekstraksi Corpus Alienum Mata', tarif: 250000, kategori: 'Tindakan Khusus' },
  { id: '9', nama: 'Ekstraksi Corpus Alienum THT', tarif: 150000, kategori: 'Tindakan Khusus' },
  { id: '10', nama: 'Debridement Luka Kecil', tarif: 100000, kategori: 'Perawatan Luka' },
  { id: '11', nama: 'Debridement Luka Digigit Binatang (Diluar Obat Anti Bisa)', tarif: 150000, kategori: 'Perawatan Luka' },
  { id: '12', nama: 'Pemasangan Dower Kateter', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '13', nama: 'Explorasi Luka (Tidak Tembus)', tarif: 200000, kategori: 'Bedah Minor' },
  { id: '14', nama: 'Explorasi Luka Tusuk Paku', tarif: 100000, kategori: 'Bedah Minor' },
  { id: '15', nama: 'Angkat Jahitan 1-10 Jahitan', tarif: 50000, kategori: 'Perawatan Luka' },
  { id: '16', nama: 'Pasang NGT', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '17', nama: 'Pasang IVFD (Infus)', tarif: 50000, kategori: 'Tindakan Keperawatan' },
  { id: '18', nama: 'Bilas Lambung + dengan NGT', tarif: 150000, kategori: 'Tindakan Khusus' },
  { id: '19', nama: 'Punctie Thorax', tarif: 200000, kategori: 'Tindakan Medis' },
  { id: '20', nama: 'Pasang Spalk Jari', tarif: 50000, kategori: 'Ortopedi' },
  { id: '21', nama: 'Pasang Spalk Tungkai Atas (Tangan)', tarif: 90000, kategori: 'Ortopedi' },
  { id: '22', nama: 'Pasang Spalk Tungkai Bawah (Kaki)', tarif: 100000, kategori: 'Ortopedi' },
  { id: '23', nama: 'Suctioning/isap lendir jalan nafas (pertindakan)', tarif: 40000, kategori: 'Resusitasi' },
  { id: '24', nama: 'Pemberian Stesolid', tarif: 10000, kategori: 'Farmasi/Tindakan' },
  { id: '25', nama: 'Pasang Gips', tarif: 400000, kategori: 'Ortopedi' },
  { id: '26', nama: 'Anuscopy', tarif: 150000, kategori: 'Diagnostik' },
  { id: '27', nama: 'Rectal Toucher / Vagina Toucher', tarif: 50000, kategori: 'Diagnostik' },
  { id: '28', nama: 'Nebulizer Inhalation', tarif: 100000, kategori: 'Resusitasi' },
  { id: '29', nama: 'Resusitasi Jantung Paru Dewasa', tarif: 250000, kategori: 'Emergensi' },
  { id: '30', nama: 'Resusitasi Jantung Paru Anak / Bayi', tarif: 250000, kategori: 'Emergensi' },
  { id: '31', nama: 'Debridement Luka Bakar: 1-9%', tarif: 80000, kategori: 'Luka Bakar' },
  { id: '32', nama: 'Debridement Luka Bakar: 9-18%', tarif: 100000, kategori: 'Luka Bakar' },
  { id: '33', nama: 'Debridement Luka Bakar: 18-36%', tarif: 150000, kategori: 'Luka Bakar' },
  { id: '34', nama: 'Debridement Luka Bakar: >36%', tarif: 250000, kategori: 'Luka Bakar' },
  { id: '35', nama: 'Vena Sectio', tarif: 320000, kategori: 'Bedah Minor' },
  { id: '36', nama: 'Pasang Tampon Hidung/ Epistaksis', tarif: 100000, kategori: 'Tindakan Khusus' },
  { id: '37', nama: 'Pasang ETT (Endo Tracheal Tube)/ Intubasi', tarif: 300000, kategori: 'Emergensi' },
  { id: '38', nama: 'DC Shock', tarif: 350000, kategori: 'Emergensi' },
  { id: '39', nama: 'Ganti Perban', tarif: 50000, kategori: 'Perawatan Luka' },
  { id: '40', nama: 'Pasang Guide', tarif: 20000, kategori: 'Alat Bantu' },
  { id: '41', nama: 'EKG', tarif: 100000, kategori: 'Diagnostik' },
  { id: '42', nama: 'Monitor Vital Sign', tarif: 100000, kategori: 'Observasi' },
  { id: '43', nama: 'Syringe Pump', tarif: 100000, kategori: 'Alat Medis' },
  { id: '44', nama: 'Infus Pump', tarif: 100000, kategori: 'Alat Medis' },
  { id: '45', nama: 'Glukotest', tarif: 30000, kategori: 'Diagnostik' },
  { id: '46', nama: 'Doppler', tarif: 50000, kategori: 'Diagnostik' },
  { id: '47', nama: 'Tracheostomi', tarif: 400000, kategori: 'Bedah Minor' },
  { id: '48', nama: 'Spalk Kecil', tarif: 50000, kategori: 'Ortopedi' },
  { id: '49', nama: 'Spalk Sedang', tarif: 75000, kategori: 'Ortopedi' },
  { id: '50', nama: 'Spalk Besar', tarif: 100000, kategori: 'Ortopedi' },
  { id: '51', nama: 'Pasang spalk infus anak', tarif: 50000, kategori: 'Ortopedi' },
  { id: '52', nama: 'Konsul dokter Spesialis', tarif: 50000, kategori: 'Konsultasi' },
  { id: '53', nama: 'Infus Intra Osteus', tarif: 100000, kategori: 'Tindakan Khusus' },
  { id: '54', nama: 'Infus Intra Umbilical', tarif: 200000, kategori: 'Tindakan Khusus' },
  { id: '55', nama: 'ODC (One Day Care) diluar obat dan tindakan', tarif: 100000, kategori: 'Perawatan' },
  { id: '56', nama: 'Irigasi mata', tarif: 50000, kategori: 'Tindakan Khusus' },
  { id: '57', nama: 'Perawatan bayi baru lahir di UGD (Tali pusat)', tarif: 50000, kategori: 'Kebidanan' },
  { id: '58', nama: 'Incubator', tarif: 80000, kategori: 'Fasilitas' },
  { id: '59', nama: 'Bebat tekan luka', tarif: 75000, kategori: 'Perawatan Luka' },
  { id: '60', nama: 'Pasang elastis verban fraktur clavikula', tarif: 80000, kategori: 'Ortopedi' },
  { id: '61', nama: 'Pasang cervical collar', tarif: 50000, kategori: 'Ortopedi' },
  { id: '62', nama: 'Rectal Suppos', tarif: 20000, kategori: 'Farmasi/Tindakan' },
  { id: '63', nama: 'Pasang elastis verband', tarif: 50000, kategori: 'Ortopedi' },
  { id: '64', nama: 'Reposisi Mandibula', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '65', nama: 'WSD (Chest Tube)', tarif: 500000, kategori: 'Bedah Minor' },
  { id: '66', nama: 'Aspirasi cairan pleura', tarif: 100000, kategori: 'Tindakan Medis' },
  { id: '67', nama: 'Pasang stogger', tarif: 40000, kategori: 'Alat Bantu' },
  { id: '68', nama: 'Pasang Katheter Urine', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '69', nama: 'Visum', tarif: 100000, kategori: 'Legal Medis' },
  { id: '70', nama: 'Pemeriksaan Surat Keterangan Klaim Asuransi', tarif: 100000, kategori: 'Administrasi' },
  { id: '71', nama: 'Pungsi supra pubic', tarif: 150000, kategori: 'Tindakan Medis' },
  { id: '72', nama: 'Extubasi', tarif: 50000, kategori: 'Emergensi' },
  { id: '73', nama: 'Pemasangan selimut pemanas', tarif: 480000, kategori: 'Fasilitas' },
  { id: '74', nama: 'Pasang Jackson Reis', tarif: 100000, kategori: 'Alat Medis' },
  { id: '75', nama: 'Pemasangan Oxymetri', tarif: 30000, kategori: 'Monitoring' },
];

export default function FormKasirIGD() {
  const [activeTab, setActiveTab] = useState<'form' | 'riwayat'>('form');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TagihanRecord | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [showShiftRecapPrint, setShowShiftRecapPrint] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const activeCashier = {
    nama: 'KONIA',
    id: '15588518525811158',
    role: 'VERIFIED KASIR'
  };

  const [formData, setFormData] = useState({
    nama: '',
    ttl: '',
    alamat: '',
    noRm: '',
    tanggal: new Date().toISOString().split('T')[0],
    dokter: '',
    triase: 'Hijau' as 'Merah' | 'Kuning' | 'Hijau',
    metodeBayar: 'Tunai / Cash' as 'Tunai / Cash' | 'Online / QRIS',
    penjaminan: 'Umum' as 'Umum' | 'BPJS',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState('Semua');
  const [riwayatSearchTerm, setRiwayatSearchTerm] = useState('');
  const [filterStatusBayar, setFilterStatusBayar] = useState('Semua Status Bayar');
  const [filterPenjaminan, setFilterPenjaminan] = useState('Semua Penjaminan');
  const [filterTriase, setFilterTriase] = useState('Semua Triase');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [bayarTunai, setBayarTunai] = useState<number | ''>('');

  const [riwayatTagihan, setRiwayatTagihan] = useState<TagihanRecord[]>([]);

  // BACA RIWAYAT DARI SUPABASE DAN FALLBACK KE LOCALSTORAGE
  const fetchRiwayatTagihan = async () => {
    try {
      const { data: headerData, error: headerError } = await supabase
        .from('pemeriksaan_igd_header')
        .select(`
          *,
          detail_pemeriksaan_igd (*)
        `)
        .order('created_at', { ascending: false });

      if (headerError) throw headerError;

      if (headerData && headerData.length > 0) {
        const mappedRiwayat: TagihanRecord[] = headerData.map((h: any) => {
          const itemMap: { [key: string]: number } = {};
          if (h.detail_pemeriksaan_igd && Array.isArray(h.detail_pemeriksaan_igd)) {
            h.detail_pemeriksaan_igd.forEach((d: any) => {
              itemMap[String(d.tindakan_id)] = d.jumlah_qty;
            });
          }

          return {
            id: `IGD-${h.id}`,
            noRm: h.no_rm || '',
            namaPasien: h.nama_pasien || '',
            ttl: h.ttl || '',
            alamat: h.alamat || '',
            tanggal: h.tanggal_pemeriksaan || '',
            dokter: h.dokter_pemeriksa || '',
            triase: (h.triase as any) || 'Hijau',
            items: itemMap,
            totalTarif: Number(h.total_biaya || 0),
            status: h.status_verifikasi || 'Menunggu Verifikasi',
            metodeBayar: h.metode_bayar || 'Tunai / Cash',
            statusBayar: h.status_bayar || 'Lunas',
            penjaminan: h.penjaminan || 'Umum',
          };
        });

        setRiwayatTagihan(mappedRiwayat);
        localStorage.setItem('rsud_igd_riwayat', JSON.stringify(mappedRiwayat));
        return;
      }
    } catch (err) {
      console.warn('Gagal ambil dari Supabase, memuat dari localStorage:', err);
    }

    // Fallback LocalStorage jika Supabase belum terisi/offline
    const saved = localStorage.getItem('rsud_igd_riwayat');
    if (saved) {
      try {
        setRiwayatTagihan(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchRiwayatTagihan();
  }, []);

  // Keyboard Shortcuts Handler (Ctrl+S untuk Simpan, Ctrl+P untuk Cetak)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'form' && !isSubmitting) {
          handleSaveAndSend();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isSubmitting, formData, selectedItems]);

  const saveToStorage = (updatedList: TagihanRecord[]) => {
    setRiwayatTagihan(updatedList);
    localStorage.setItem('rsud_igd_riwayat', JSON.stringify(updatedList));
  };

  const kategoriList = useMemo(() => {
    const kat = new Set(daftarTindakanIGD.map(i => i.kategori));
    return ['Semua', ...Array.from(kat)];
  }, []);

  const pasienPreviousHistory = useMemo(() => {
    if (!formData.noRm.trim()) return [];
    return riwayatTagihan.filter(
      (item) => item.noRm.toLowerCase().trim() === formData.noRm.toLowerCase().trim()
    );
  }, [formData.noRm, riwayatTagihan]);

  // Autocomplete suggestions for patient search in form
  const patientSuggestions = useMemo(() => {
    if (!formData.noRm.trim() && !formData.nama.trim()) return [];
    const q = (formData.noRm || formData.nama).toLowerCase();
    const map = new Map();
    riwayatTagihan.forEach(r => {
      if (r.noRm.toLowerCase().includes(q) || r.namaPasien.toLowerCase().includes(q)) {
        map.set(r.noRm, r);
      }
    });
    return Array.from(map.values()).slice(0, 5);
  }, [formData.noRm, formData.nama, riwayatTagihan]);

  const autofillPasienData = (rec: TagihanRecord) => {
    setFormData((prev) => ({
      ...prev,
      noRm: rec.noRm,
      nama: rec.namaPasien,
      ttl: rec.ttl,
      alamat: rec.alamat,
      triase: rec.triase || 'Hijau',
      penjaminan: rec.penjaminan || 'Umum',
    }));
    showToast(`Data pasien ${rec.namaPasien} berhasil diisi otomatis!`, 'success');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQtyChange = (id: string, qty: number) => {
    const updated = { ...selectedItems };
    if (qty <= 0) {
      delete updated[id];
    } else {
      updated[id] = qty;
    }
    setSelectedItems(updated);
  };

  const handleClearSelectedItems = () => {
    if (Object.keys(selectedItems).length === 0) return;
    if (confirm('Apakah Anda ingin mengosongkan semua tindakan yang dipilih?')) {
      setSelectedItems({});
      showToast('Semua tindakan berhasil dikosongkan.', 'info');
    }
  };

  const handleResetForm = () => {
    if (confirm('Apakah Anda yakin ingin mereset formulir ini?')) {
      setFormData({
        nama: '',
        ttl: '',
        alamat: '',
        noRm: '',
        tanggal: new Date().toISOString().split('T')[0],
        dokter: '',
        triase: 'Hijau',
        metodeBayar: 'Tunai / Cash',
        penjaminan: 'Umum',
      });
      setSelectedItems({});
      setBayarTunai('');
      showToast('Formulir berhasil direset.', 'info');
    }
  };

  const filteredTindakan = useMemo(() => {
    return daftarTindakanIGD.filter((item) => {
      const matchSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKat = selectedKategoriFilter === 'Semua' || item.kategori === selectedKategoriFilter;
      return matchSearch && matchKat;
    });
  }, [searchTerm, selectedKategoriFilter]);

  const filteredRiwayat = useMemo(() => {
    return riwayatTagihan.filter((item) => {
      const matchSearch = item.noRm.toLowerCase().includes(riwayatSearchTerm.toLowerCase()) ||
                          item.namaPasien.toLowerCase().includes(riwayatSearchTerm.toLowerCase()) ||
                          item.id.toLowerCase().includes(riwayatSearchTerm.toLowerCase());
      
      const matchStatus = filterStatusBayar === 'Semua Status Bayar' || item.statusBayar === filterStatusBayar;
      const matchPenjaminan = filterPenjaminan === 'Semua Penjaminan' || item.penjaminan === filterPenjaminan;
      const matchTriase = filterTriase === 'Semua Triase' || item.triase === filterTriase;
      const matchDate = !filterTanggal || item.tanggal.includes(filterTanggal);

      return matchSearch && matchStatus && matchPenjaminan && matchTriase && matchDate;
    });
  }, [riwayatTagihan, riwayatSearchTerm, filterStatusBayar, filterPenjaminan, filterTriase, filterTanggal]);

  const totalNominalFilter = useMemo(() => {
    return filteredRiwayat.reduce((sum, item) => sum + item.totalTarif, 0);
  }, [filteredRiwayat]);

  const totalTunaiFilter = useMemo(() => {
    return filteredRiwayat
      .filter((item) => item.metodeBayar === 'Tunai / Cash')
      .reduce((sum, item) => sum + item.totalTarif, 0);
  }, [filteredRiwayat]);

  const totalOnlineFilter = useMemo(() => {
    return filteredRiwayat
      .filter((item) => item.metodeBayar === 'Online / QRIS')
      .reduce((sum, item) => sum + item.totalTarif, 0);
  }, [filteredRiwayat]);

  const totalTarif = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
    const item = daftarTindakanIGD.find((t) => t.id === id);
    return sum + (item ? item.tarif * qty : 0);
  }, 0);

  const kembalianTunai = useMemo(() => {
    if (typeof bayarTunai === 'number' && bayarTunai >= totalTarif) {
      return bayarTunai - totalTarif;
    }
    return 0;
  }, [bayarTunai, totalTarif]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintShiftRecap = () => {
    setShowShiftRecapPrint(true);
    setTimeout(() => {
      window.print();
      setShowShiftRecapPrint(false);
    }, 200);
  };

  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(riwayatTagihan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_kasir_igd_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Berhasil mengunduh cadangan data JSON.', 'success');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          saveToStorage(parsed);
          showToast(`Berhasil memulihkan ${parsed.length} data riwayat transaksi!`, 'success');
        } else {
          showToast('Format file JSON tidak valid.', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON cadangan.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // SIMPAN KE SUPABASE & LOCALSTORAGE SECARA BERSAMAAN
  const handleSaveAndSend = async () => {
    if (!formData.nama || !formData.noRm) {
      showToast('Mohon lengkapi Nama Pasien dan Nomor Rekam Medis (No RM) terlebih dahulu!', 'error');
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      showToast('Mohon pilih minimal 1 tindakan medis / pemeriksaan!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Simpan Header ke Supabase
      const headerPayload = {
        no_rm: formData.noRm,
        nama_pasien: formData.nama,
        ttl: formData.ttl,
        alamat: formData.alamat,
        tanggal_pemeriksaan: formData.tanggal,
        dokter_pemeriksa: formData.dokter || 'Dokter Jaga IGD',
        triase: formData.triase,
        metode_bayar: formData.metodeBayar,
        penjaminan: formData.penjaminan,
        total_biaya: totalTarif,
        status_bayar: 'Lunas',
        status_verifikasi: 'Menunggu Verifikasi',
        kasir_nip: activeCashier.id,
        kasir_nama: activeCashier.nama
      };

      const { data: headerResult, error: headerError } = await supabase
        .from('pemeriksaan_igd_header')
        .insert([headerPayload])
        .select()
        .single();

      if (headerError) throw headerError;

      const headerId = headerResult.id;

      // 2. Simpan Detail Item ke Supabase
      const detailPayload = Object.entries(selectedItems).map(([tindakanId, qty]) => {
        const itemInfo = daftarTindakanIGD.find(t => t.id === tindakanId);
        const tarifSatuan = itemInfo ? itemInfo.tarif : 0;
        return {
          pemeriksaan_id: headerId,
          tindakan_id: Number(tindakanId),
          jumlah_qty: qty,
          tarif_satuan: tarifSatuan,
          subtotal: qty * tarifSatuan
        };
      });

      const { error: detailError } = await supabase
        .from('detail_pemeriksaan_igd')
        .insert(detailPayload);

      if (detailError) throw detailError;

      // 3. Simpan ke LocalStorage sebagai cadangan lokal
      const newRecord: TagihanRecord = {
        id: `IGD-${headerId}`,
        noRm: formData.noRm,
        namaPasien: formData.nama,
        ttl: formData.ttl,
        alamat: formData.alamat,
        tanggal: formData.tanggal,
        dokter: formData.dokter || 'Dokter Jaga IGD',
        triase: formData.triase,
        items: { ...selectedItems },
        totalTarif: totalTarif,
        status: 'Menunggu Verifikasi',
        metodeBayar: formData.metodeBayar,
        statusBayar: 'Lunas',
        penjaminan: formData.penjaminan,
      };

      const updatedList = [newRecord, ...riwayatTagihan];
      saveToStorage(updatedList);

      showToast(`Data rincian biaya IGD untuk pasien ${formData.nama} BERHASIL disimpan ke Supabase!`, 'success');

      // Refresh riwayat dari Supabase
      await fetchRiwayatTagihan();

      setFormData({
        nama: '',
        ttl: '',
        alamat: '',
        noRm: '',
        tanggal: new Date().toISOString().split('T')[0],
        dokter: '',
        triase: 'Hijau',
        metodeBayar: 'Tunai / Cash',
        penjaminan: 'Umum',
      });
      setSelectedItems({});
      setBayarTunai('');
      setActiveTab('riwayat');

    } catch (err: any) {
      console.error('Gagal simpan ke Supabase:', err);
      showToast(`Gagal menyimpan ke Supabase: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredRiwayat.length === 0) {
      showToast('Tidak ada data yang dapat diexport.', 'error');
      return;
    }
    showToast(`Berhasil mengekspor ${filteredRiwayat.length} data transaksi ke Excel.`, 'success');
  };

  const copySummaryToClipboard = () => {
    const text = `RSUD BUKIT KERMAN - KASIR IGD\nPasien: ${formData.nama || '-'}\nNo RM: ${formData.noRm || '-'}\nTriase: ${formData.triase}\nTotal: ${formatRupiah(totalTarif)}\nKasir: ${activeCashier.nama}`;
    navigator.clipboard.writeText(text);
    showToast('Ringkasan tagihan disalin ke clipboard!', 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans relative pb-16 lg:pb-0">
      
      {/* TOAST NOTIFICATION COMPONENT */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce print:hidden">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white ${
            toast.type === 'success' ? 'bg-emerald-700' : toast.type === 'error' ? 'bg-rose-700' : 'bg-sky-700'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* HIDDEN FILE INPUT FOR RESTORE BACKUP */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleRestoreBackup} 
        accept=".json" 
        className="hidden" 
      />

      <div className="print:hidden">
        <KasirHeader 
          title="RSUD BUKIT KERMAN"
          subtitle="Modul Input Perincian Biaya IGD (Kasir)"
          userName={activeCashier.nama} 
        />
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-6 sm:py-8 w-full print:p-0 print:m-0 print:max-w-none">
        
        {/* NAVIGASI UTAMA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shadow-sm ${
                activeTab === 'form' 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-md' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Form Input Pemeriksaan IGD</span>
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shadow-sm ${
                activeTab === 'riwayat' 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-md' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Daftar Riwayat &amp; Akumulasi Tagihan ({riwayatTagihan.length})</span>
            </button>
          </div>
          
          <div className="hidden lg:flex items-center gap-2 text-[11px] bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Database Supabase &amp; Storage Lokal ({riwayatTagihan.length} Transaksi)
          </div>
        </div>

        {/* TAB 1: FORM INPUT */}
        {activeTab === 'form' && (
          <div>
            {/* TAMPILAN INTERAKTIF DI LAYAR (SCREEN VIEW) */}
            <div className="bg-white text-slate-800 shadow-2xl rounded-3xl p-6 sm:p-10 border border-slate-200 print:hidden">
              
              {/* KOP SURAT INTERAKTIF */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                  <img src="/logo-kerinci.png" alt="Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-center px-2 flex-grow">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">PEMERINTAH KABUPATEN KERINCI</p>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">DINAS KESEHATAN</p>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 mt-0.5">RSUD BUKIT KERMAN</h1>
                  <p className="text-[11px] text-slate-600">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[11px] text-slate-600">Website: https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                  <img src="/logo-rsud.jpeg" alt="RSUD Bukit Kerman" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="inline-block bg-slate-900 text-white text-xs font-extrabold px-6 py-2 rounded-full uppercase tracking-widest shadow-md">
                  FORMULIR PEMERIKSAAN &amp; RINCIAN BIAYA IGD
                </div>
              </div>

              {/* INFO PETUGAS KASIR */}
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-inner">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Petugas Penginput Data (Penanggung Jawab Sesi)</p>
                    <p className="text-sm font-black text-slate-900">{activeCashier.nama} <span className="text-xs font-medium text-slate-500">(NIP / ID: {activeCashier.id})</span></p>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1.5 rounded-full uppercase border border-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> STATUS AKSES: {activeCashier.role}
                </span>
              </div>

              {/* ALERT PASIEN LAMA */}
              {pasienPreviousHistory.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-6 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-grow">
                      <p className="text-xs font-black text-amber-900 uppercase">
                        Pasien Ditemukan! Terdeteksi {pasienPreviousHistory.length} Kali Kunjungan IGD Sebelumnya.
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Nomor RM <span className="font-bold">{formData.noRm}</span> sudah terdaftar atas nama <span className="font-bold">{pasienPreviousHistory[0].namaPasien}</span>.
                      </p>
                      <button
                        onClick={() => autofillPasienData(pasienPreviousHistory[0])}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition shadow cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Isi Otomatis Biodata Pasien
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FORM INPUT DATA PASIEN */}
              <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200 mb-8 space-y-4 shadow-sm relative">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-sky-600" /> Identitas Pasien &amp; Informasi Klinis
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  <div className="relative">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nomor Rekam Medis (No RM)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        name="noRm" 
                        value={formData.noRm} 
                        onChange={handleInputChange} 
                        placeholder="Contoh: 00-12-34 (Ketik untuk deteksi otomatis)" 
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-sky-800 focus:ring-2 focus:ring-sky-500 shadow-sm"
                      />
                    </div>

                    {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                    {patientSuggestions.length > 0 && formData.noRm.trim() !== '' && pasienPreviousHistory.length === 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        <div className="p-2 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Saran Riwayat Pasien:</div>
                        {patientSuggestions.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => autofillPasienData(s)}
                            className="p-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{s.namaPasien}</span>
                              <span className="text-[10px] text-slate-500 ml-2 font-mono">RM: {s.noRm}</span>
                            </div>
                            <span className="text-[10px] text-sky-600 font-bold bg-sky-100 px-2 py-0.5 rounded">Pilih</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Nama Lengkap Pasien</label>
                    <input 
                      type="text" 
                      name="nama" 
                      value={formData.nama} 
                      onChange={handleInputChange} 
                      placeholder="Masukkan nama lengkap pasien" 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tempat, Tanggal Lahir (TTL)</label>
                    <input 
                      type="text" 
                      name="ttl" 
                      value={formData.ttl} 
                      onChange={handleInputChange} 
                      placeholder="Contoh: Kerinci, 12 Januari 1990" 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Tanggal Pemeriksaan IGD</label>
                    <input 
                      type="date" 
                      name="tanggal" 
                      value={formData.tanggal} 
                      onChange={handleInputChange} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Alamat Domisili Lengkap</label>
                    <input 
                      type="text" 
                      name="alamat" 
                      value={formData.alamat} 
                      onChange={handleInputChange} 
                      placeholder="Masukkan alamat lengkap pasien" 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Dokter Pemeriksa IGD</label>
                    <input 
                      type="text" 
                      name="dokter" 
                      value={formData.dokter} 
                      onChange={handleInputChange} 
                      placeholder="Nama Dokter Jaga IGD" 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Kategori Triase IGD</label>
                    <select 
                      name="triase"
                      value={formData.triase}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    >
                      <option value="Hijau">Hijau - Non-Darurat / Ringan</option>
                      <option value="Kuning">Kuning - Darurat Ringan / Sedang</option>
                      <option value="Merah">Merah - Resusitasi / Gawat Darurat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Metode Pembayaran</label>
                    <select 
                      name="metodeBayar"
                      value={formData.metodeBayar}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    >
                      <option value="Tunai / Cash">Tunai / Cash (Fisik di Laci)</option>
                      <option value="Online / QRIS">Online / QRIS (Transfer / Rekening RSUD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Penjaminan Pasien</label>
                    <select 
                      name="penjaminan"
                      value={formData.penjaminan}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 shadow-sm"
                    >
                      <option value="Umum">Umum / Mandiri</option>
                      <option value="BPJS">BPJS Kesehatan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TABEL TINDAKAN IGD & PANEL QUICK PICK */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-sky-600" /> Daftar Tindakan &amp; Pemeriksaan IGD
                  </h3>
                  {Object.keys(selectedItems).length > 0 && (
                    <button
                      onClick={handleClearSelectedItems}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Kosongkan semua item terpilih"
                    >
                      <Trash2 className="w-3 h-3" /> Kosongkan ({Object.values(selectedItems).reduce((a,b)=>a+b,0)})
                    </button>
                  )}
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari tindakan medis..." 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>
              </div>

              {/* BARIS TINDAKAN FAVORIT (QUICK SHORTCUTS) */}
              <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded-2xl mb-4">
                <div className="flex items-center gap-1.5 mb-2 text-sky-900 text-[11px] font-black uppercase">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Pintasan Cepat Tindakan Sering Digunakan:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['1', '17', '41', '12', '39', '20'].map((id) => {
                    const item = daftarTindakanIGD.find(t => t.id === id);
                    if (!item) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => handleQtyChange(item.id, (selectedItems[item.id] || 0) + 1)}
                        className="px-3 py-1.5 bg-white hover:bg-sky-600 hover:text-white text-sky-800 border border-sky-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm group"
                      >
                        <span className="group-hover:text-white">+ {item.nama}</span>
                        <span className="text-slate-500 group-hover:text-sky-100 font-mono text-[10px]">({formatRupiah(item.tarif)})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTER KATEGORI (CHIPS/BADGES) */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {kategoriList.map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setSelectedKategoriFilter(kat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                      selectedKategoriFilter === kat
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-6 shadow-sm max-h-[450px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white uppercase text-[10px] z-10">
                    <tr>
                      <th className="p-3 border-b">Kategori</th>
                      <th className="p-3 border-b">Jenis Pemeriksaan / Tindakan Medis IGD</th>
                      <th className="p-3 text-right border-b">Tarif (Rp)</th>
                      <th className="p-3 text-center w-36 border-b">Jumlah (Qty)</th>
                      <th className="p-3 text-right border-b">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTindakan.length > 0 ? (
                      filteredTindakan.map((item) => {
                        const qty = selectedItems[item.id] || 0;
                        const subtotal = qty * item.tarif;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-bold text-[10px] text-sky-700 uppercase">{item.kategori}</td>
                            <td className="p-3 font-bold text-slate-800">{item.nama}</td>
                            <td className="p-3 text-right text-slate-600">{formatRupiah(item.tarif)}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleQtyChange(item.id, qty - 1)}
                                  className="w-7 h-7 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center justify-center font-bold transition cursor-pointer"
                                  title="Kurangi"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input 
                                  type="number" 
                                  min="0" 
                                  value={qty === 0 ? '' : qty} 
                                  onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)} 
                                  placeholder="0"
                                  className="w-12 p-1 text-center border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500"
                                />
                                <button
                                  onClick={() => handleQtyChange(item.id, qty + 1)}
                                  className="w-7 h-7 bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center justify-center font-bold transition cursor-pointer shadow-sm"
                                  title="Tambah"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right font-black text-sky-700">
                              {subtotal > 0 ? formatRupiah(subtotal) : '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          Tindakan tidak ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* TOTAL KESELURUHAN TARIF & KALKULATOR PEMBAYARAN TUNAI */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-6 h-6 text-sky-400" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Biaya Tindakan IGD</p>
                      <p className="text-sm font-semibold text-slate-200">Akumulasi Seluruh Pemeriksaan</p>
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight font-mono mt-3">
                    {formatRupiah(totalTarif)}
                  </div>
                </div>

                {formData.metodeBayar === 'Tunai / Cash' ? (
                  <div className="bg-emerald-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Banknote className="w-6 h-6 text-emerald-300" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">Kalkulator Pembayaran Tunai</p>
                          <p className="text-sm font-semibold text-emerald-100">Uang Diterima dari Pasien</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input 
                        type="number"
                        value={bayarTunai}
                        onChange={(e) => setBayarTunai(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Masukkan nominal uang..."
                        className="w-full p-2 bg-emerald-950 border border-emerald-600 rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>

                    {/* QUICK EXACT CASH BUTTON */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-emerald-200 font-bold">Pintasan Uang Pas:</span>
                      <button
                        onClick={() => setBayarTunai(totalTarif)}
                        className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border border-emerald-600"
                      >
                        Uang Pas ({formatRupiah(totalTarif)})
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-emerald-700 text-xs">
                      <span className="text-emerald-200 font-bold">Kembalian:</span>
                      <span className="font-mono font-black text-base text-emerald-300">{formatRupiah(kembalianTunai)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-sky-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                    <div className="flex items-center space-x-2">
                      <Banknote className="w-6 h-6 text-sky-300" />
                      <div>
                        <p className="text-xs uppercase tracking-wider text-sky-200 font-bold">Metode QRIS / Online</p>
                        <p className="text-sm font-semibold text-sky-100">Verifikasi Langsung ke Rekening RSUD</p>
                      </div>
                    </div>
                    <p className="text-xs text-sky-200 mt-4">Pastikan bukti transfer/QRIS telah diverifikasi sebelum menyimpan.</p>
                  </div>
                )}
              </div>

              {/* TANDA TANGAN */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs font-medium text-slate-700 mb-8 pt-4">
                <div>
                  <p className="mb-16">Pasien / PJ Pasien / Keluarga</p>
                  <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[180px] uppercase">
                    ({formData.nama || '...........................................'})
                  </p>
                </div>
                <div>
                  <p className="mb-1">Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mb-14">Petugas Kasir (Penanggung Jawab)</p>
                  <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[180px] uppercase">
                    ( {activeCashier.nama} )
                  </p>
                </div>
              </div>

              {/* TOMBOL AKSI */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-4 gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleResetForm}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button
                    onClick={copySummaryToClipboard}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Salin ringkasan tagihan ke clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin Teks
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => setShowThermalModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-indigo-600" /> Struk Thermal
                  </button>
                  <button 
                    onClick={() => setShowPreviewModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-sky-600" /> Pratinjau Struk
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-sky-400" /> Cetak Formulir
                  </button>
                  <button 
                    onClick={handleSaveAndSend}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan &amp; Kirim (Ctrl+S)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* FLOATING MOBILE TOTAL BAR */}
            {Object.keys(selectedItems).length > 0 && activeTab === 'form' && (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur text-white p-3 px-4 flex items-center justify-between shadow-2xl lg:hidden border-t border-slate-700">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total ({Object.values(selectedItems).reduce((a,b)=>a+b,0)} Tindakan):</p>
                  <p className="text-sm font-black font-mono text-sky-400">{formatRupiah(totalTarif)}</p>
                </div>
                <button
                  onClick={handleSaveAndSend}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Tagihan'}
                </button>
              </div>
            )}

            {/* TAMPILAN CETAK RESMI RUMAH SAKIT (PRINT-ONLY LAYOUT) */}
            <div className="hidden print:block bg-white text-black p-6 font-sans">
              <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img src="/logo-kerinci.png" alt="Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-center px-2 flex-grow">
                  <p className="text-[11px] font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider">DINAS KESEHATAN</p>
                  <h1 className="text-lg font-black uppercase tracking-wide mt-0.5">RSUD BUKIT KERMAN</h1>
                  <p className="text-[9px]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[9px]">Website: https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <img src="/logo-rsud.jpeg" alt="RSUD Bukit Kerman" className="max-h-full max-w-full object-contain" />
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="inline-block border border-black px-6 py-1 text-xs font-black uppercase tracking-wider">
                  SURAT PERINCIAN BIAYA PELAYANAN IGD
                </div>
              </div>

              {/* DATA PASIEN PRINT FORMAT */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-6 border border-black p-4">
                <div><span className="font-bold">No. Rekam Medis (RM):</span> {formData.noRm || '-'}</div>
                <div><span className="font-bold">Tanggal Pemeriksaan:</span> {formData.tanggal || '-'}</div>
                <div><span className="font-bold">Nama Pasien:</span> {formData.nama || '-'}</div>
                <div><span className="font-bold">Dokter Pemeriksa:</span> {formData.dokter || 'Dokter Jaga IGD'}</div>
                <div><span className="font-bold">Tempat, Tgl Lahir:</span> {formData.ttl || '-'}</div>
                <div><span className="font-bold">Triase / Penjaminan:</span> {formData.triase} ({formData.penjaminan})</div>
                <div className="col-span-2"><span className="font-bold">Alamat:</span> {formData.alamat || '-'}</div>
              </div>

              {/* TABEL ITEM TINDAKAN PRINT FORMAT */}
              <table className="w-full text-left border-collapse text-xs mb-6">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-2 px-2">No</th>
                    <th className="py-2 px-2">Kategori</th>
                    <th className="py-2 px-2">Jenis Tindakan Medis IGD</th>
                    <th className="py-2 px-2 text-right">Tarif (Rp)</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {Object.entries(selectedItems).map(([id, qty], index) => {
                    const item = daftarTindakanIGD.find(t => t.id === id);
                    if (!item) return null;
                    const subtotal = qty * item.tarif;
                    return (
                      <tr key={id}>
                        <td className="py-1.5 px-2">{index + 1}</td>
                        <td className="py-1.5 px-2 font-bold text-[10px]">{item.kategori}</td>
                        <td className="py-1.5 px-2 font-bold">{item.nama}</td>
                        <td className="py-1.5 px-2 text-right">{formatRupiah(item.tarif)}</td>
                        <td className="py-1.5 px-2 text-center">{qty}</td>
                        <td className="py-1.5 px-2 text-right font-black">{formatRupiah(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* TOTAL PRINT FORMAT */}
              <div className="flex justify-between items-center border-t-2 border-black pt-3 mb-8 text-sm font-black">
                <span>TOTAL KESELURUHAN BIAYA TINDAKAN IGD:</span>
                <span className="text-base font-mono">{formatRupiah(totalTarif)}</span>
              </div>

              {/* TTD PRINT FORMAT */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12">
                <div>
                  <p className="mb-20">Pasien / Keluarga Pasien</p>
                  <p className="font-bold underline uppercase">({formData.nama || '...........................................'})</p>
                </div>
                <div>
                  <p className="mb-1">Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mb-20">Petugas Kasir IGD</p>
                  <p className="font-bold underline uppercase">({activeCashier.nama})</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAFTAR RIWAYAT & AKUMULASI TAGIHAN */}
        {activeTab === 'riwayat' && (
          <div className="space-y-6">
            
            {/* KARTU STATISTIK KEUANGAN & TRIASE */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Filter ({filteredRiwayat.length} Pasien)</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">{formatRupiah(totalNominalFilter)}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Pendapatan keseluruhan</p>
              </div>

              <div className="bg-rose-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200">Triase Merah (Resusitasi)</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                    {formatRupiah(filteredRiwayat.filter(i => i.triase === 'Merah').reduce((s, i) => s + i.totalTarif, 0))}
                  </p>
                </div>
                <p className="text-[10px] text-rose-200 mt-3">{filteredRiwayat.filter(i => i.triase === 'Merah').length} Kasus</p>
              </div>

              <div className="bg-amber-800 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200">Triase Kuning (Darurat)</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                    {formatRupiah(filteredRiwayat.filter(i => i.triase === 'Kuning').reduce((s, i) => s + i.totalTarif, 0))}
                  </p>
                </div>
                <p className="text-[10px] text-amber-200 mt-3">{filteredRiwayat.filter(i => i.triase === 'Kuning').length} Kasus</p>
              </div>

              <div className="bg-emerald-800 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Triase Hijau (Ringan)</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                    {formatRupiah(filteredRiwayat.filter(i => i.triase === 'Hijau').reduce((s, i) => s + i.totalTarif, 0))}
                  </p>
                </div>
                <p className="text-[10px] text-emerald-200 mt-3">{filteredRiwayat.filter(i => i.triase === 'Hijau').length} Kasus</p>
              </div>
            </div>

            {/* PANEL FILTER & KONTROL TABEL */}
            <div className="bg-white text-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6">
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Menampilkan seluruh data riwayat transaksi kasir IGD.</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    title="Unduh file JSON cadangan data riwayat"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Backup</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    title="Pulihkan data dari file JSON"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={handlePrintShiftRecap}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Rekap Shift</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel ({filteredRiwayat.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('form')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer flex-shrink-0"
                  >
                    + Input Baru
                  </button>
                </div>
              </div>

              {/* FILTER BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={riwayatSearchTerm}
                    onChange={(e) => setRiwayatSearchTerm(e.target.value)}
                    placeholder="Cari RM / Nama Pasien..." 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <select
                    value={filterStatusBayar}
                    onChange={(e) => setFilterStatusBayar(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Semua Status Bayar">Semua Status Bayar</option>
                    <option value="Lunas">Lunas</option>
                    <option value="Belum Bayar">Belum Bayar</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filterPenjaminan}
                    onChange={(e) => setFilterPenjaminan(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Semua Penjaminan">Semua Penjaminan</option>
                    <option value="Umum">Umum / Mandiri</option>
                    <option value="BPJS">BPJS Kesehatan</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filterTriase}
                    onChange={(e) => setFilterTriase(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Semua Triase">Semua Triase</option>
                    <option value="Merah">Triase Merah</option>
                    <option value="Kuning">Triase Kuning</option>
                    <option value="Hijau">Triase Hijau</option>
                  </select>
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={filterTanggal}
                    onChange={(e) => setFilterTanggal(e.target.value)}
                    placeholder="dd/mm/yyyy" 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* TABEL RIWAYAT */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">ID Transaksi</th>
                      <th className="p-3">No RM / Nama Pasien</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Triase / Penjaminan</th>
                      <th className="p-3 text-right">Total Tarif</th>
                      <th className="p-3 text-center">Status Admin</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRiwayat.length > 0 ? (
                      filteredRiwayat.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="p-3 font-mono font-bold text-sky-700">{item.id}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{item.namaPasien}</p>
                            <p className="text-[10px] text-slate-500 font-mono font-bold">RM: {item.noRm}</p>
                          </td>
                          <td className="p-3 text-slate-600">{item.tanggal}</td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-700">{item.metodeBayar}</p>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                              item.triase === 'Merah' ? 'bg-rose-100 text-rose-800' :
                              item.triase === 'Kuning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Triase: {item.triase || 'Hijau'} ({item.penjaminan || 'Umum'})
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">{formatRupiah(item.totalTarif)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 
                              item.status === 'Direvisi' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button 
                                onClick={() => setSelectedDetailRecord(item)}
                                className="p-1.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-600 rounded-lg transition cursor-pointer"
                                title="Lihat Rincian & Status Admin"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                          {riwayatTagihan.length === 0 
                            ? 'Belum ada data riwayat tagihan IGD yang diinput. Silakan buat input baru melalui tab Form.' 
                            : 'Pencarian pasien atau filter tidak ditemukan.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* PRINT LAYOUT KHUSUS REKAP SHIFT KEUANGAN */}
      {showShiftRecapPrint && (
        <div className="hidden print:block bg-white text-black p-6 font-sans">
          <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/logo-kerinci.png" alt="Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-center px-2 flex-grow">
              <p className="text-[11px] font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</p>
              <p className="text-[11px] font-bold uppercase tracking-wider">DINAS KESEHATAN - RSUD BUKIT KERMAN</p>
              <h1 className="text-lg font-black uppercase tracking-wide mt-0.5">LAPORAN REKAPITULASI SHIFT KASIR IGD</h1>
              <p className="text-[9px]">Periode Laporan Sesi Shift Aktif Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/logo-rsud.jpeg" alt="RSUD Bukit Kerman" className="max-h-full max-w-full object-contain" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-black p-4">
            <div><span className="font-bold">Nama Petugas Kasir:</span> {activeCashier.nama} (ID: {activeCashier.id})</div>
            <div><span className="font-bold">Total Pasien Terlayani:</span> {filteredRiwayat.length} Orang</div>
            <div><span className="font-bold">Penerimaan Tunai (Cash):</span> {formatRupiah(totalTunaiFilter)}</div>
            <div><span className="font-bold">Penerimaan Online (QRIS):</span> {formatRupiah(totalOnlineFilter)}</div>
            <div className="col-span-2 border-t border-black pt-2 flex justify-between font-black text-sm">
              <span>TOTAL AKUMULASI PENDAPATAN SHIFT:</span>
              <span>{formatRupiah(totalNominalFilter)}</span>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs mb-6">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 px-2">No</th>
                <th className="py-2 px-2">ID Transaksi</th>
                <th className="py-2 px-2">No RM / Nama Pasien</th>
                <th className="py-2 px-2">Triase &amp; Pembayaran</th>
                <th className="py-2 px-2 text-right">Tarif (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30">
              {filteredRiwayat.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-2">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-mono">{item.id}</td>
                  <td className="py-1.5 px-2 font-bold">{item.noRm} - {item.namaPasien}</td>
                  <td className="py-1.5 px-2">Triase: {item.triase || 'Hijau'} | {item.metodeBayar}</td>
                  <td className="py-1.5 px-2 text-right font-black">{formatRupiah(item.totalTarif)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12">
            <div>
              <p className="mb-20">Mengetahui,<br/>Bendahara Penerimaan RSUD</p>
              <p className="font-bold underline uppercase">( ............................................ )</p>
            </div>
            <div>
              <p className="mb-1">Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="mb-20">Petugas Kasir IGD</p>
              <p className="font-bold underline uppercase">({activeCashier.nama})</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU STRUK (*PREVIEW MODAL*) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Pratinjau Struk / Tagihan IGD</h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition cursor-pointer">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4 font-mono">
              <p><span className="font-bold">Pasien:</span> {formData.nama || '(Belum diisi)'}</p>
              <p><span className="font-bold">No RM:</span> {formData.noRm || '(Belum diisi)'}</p>
              <p><span className="font-bold">Triase:</span> {formData.triase}</p>
              <p><span className="font-bold">Metode:</span> {formData.metodeBayar} ({formData.penjaminan})</p>
              <p><span className="font-bold">Total Biaya:</span> {formatRupiah(totalTarif)}</p>
              <p><span className="font-bold">Jumlah Item:</span> {Object.keys(selectedItems).length} Tindakan dipilih</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handlePrint();
                }}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STRUK THERMAL KASIR (80MM) */}
      {showThermalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Struk Thermal Kasir (80mm)</h3>
              <button onClick={() => setShowThermalModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition cursor-pointer">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* THERMAL PAPER CONTAINER */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 font-mono text-[11px] text-slate-900 space-y-1 mb-4 shadow-inner">
              <div className="text-center font-bold border-b border-dashed border-slate-400 pb-2 mb-2">
                <p>RSUD BUKIT KERMAN</p>
                <p className="text-[9px]">INSTALASI GAWAT DARURAT (IGD)</p>
              </div>
              <p><span className="font-bold">Tgl:</span> {new Date().toLocaleDateString('id-ID')}</p>
              <p><span className="font-bold">RM:</span> {formData.noRm || '-'}</p>
              <p><span className="font-bold">Pasien:</span> {formData.nama || '-'}</p>
              <p><span className="font-bold">Triase:</span> {formData.triase}</p>
              <div className="border-t border-dashed border-slate-400 pt-2 my-2">
                {Object.entries(selectedItems).map(([id, qty]) => {
                  const item = daftarTindakanIGD.find(t => t.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between text-[10px]">
                      <span>{qty}x {item.nama.substring(0, 18)}</span>
                      <span>{formatRupiah(qty * item.tarif)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-dashed border-slate-400 pt-2 flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>{formatRupiah(totalTarif)}</span>
              </div>
              <div className="text-center text-[9px] text-slate-500 pt-3 border-t border-dashed border-slate-400 mt-2">
                <p>Kasir: {activeCashier.nama}</p>
                <p>TERIMA KASIH &amp; LEKAS SEMBUH</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowThermalModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowThermalModal(false);
                  handlePrint();
                }}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Thermal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RINCIAN & STATUS ADMIN */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Rincian Tagihan &amp; Status Admin</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID Transaksi: {selectedDetailRecord.id}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailRecord(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* STATUS BANNER */}
            <div className={`p-4 rounded-2xl mb-5 flex items-center justify-between border ${
              selectedDetailRecord.status === 'Disetujui' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
              selectedDetailRecord.status === 'Direvisi' ? 'bg-rose-50 border-rose-200 text-rose-900' :
              'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Status Verifikasi oleh Admin Rumah Sakit</p>
                <p className="text-sm font-black uppercase mt-0.5">{selectedDetailRecord.status}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white/80 rounded-full shadow-sm">
                {selectedDetailRecord.status === 'Disetujui' ? 'Tervalidasi' : 'Dalam Pengecekan'}
              </span>
            </div>

            {/* BIODATA PASIEN */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500 font-medium">No. RM:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.noRm}</span></div>
                <div><span className="text-slate-500 font-medium">Tanggal:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.tanggal}</span></div>
                <div><span className="text-slate-500 font-medium">Nama Pasien:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.namaPasien}</span></div>
                <div><span className="text-slate-500 font-medium">Dokter:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.dokter}</span></div>
                <div><span className="text-slate-500 font-medium">Triase:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.triase || 'Hijau'}</span></div>
                <div><span className="text-slate-500 font-medium">Metode Bayar:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.metodeBayar} ({selectedDetailRecord.penjaminan})</span></div>
                <div className="col-span-2"><span className="text-slate-500 font-medium">Alamat:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.alamat || '-'}</span></div>
              </div>
            </div>

            {/* TABEL ITEM RINCIAN */}
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">Item Pemeriksaan &amp; Tindakan Medis</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Nama Tindakan</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Tarif</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(selectedDetailRecord.items).map(([id, qty]) => {
                    const item = daftarTindakanIGD.find(t => t.id === id);
                    if (!item) return null;
                    const subtotal = qty * item.tarif;
                    return (
                      <tr key={id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{item.nama}</td>
                        <td className="p-2.5 text-center font-bold">{qty}</td>
                        <td className="p-2.5 text-right text-slate-600">{formatRupiah(item.tarif)}</td>
                        <td className="p-2.5 text-right font-black text-sky-700">{formatRupiah(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TOTAL */}
            <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Keseluruhan Biaya</span>
              <span className="text-lg font-black font-mono text-sky-400">{formatRupiah(selectedDetailRecord.totalTarif)}</span>
            </div>

            {/* TOMBOL TUTUP & CETAK ULANG */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    nama: selectedDetailRecord.namaPasien,
                    noRm: selectedDetailRecord.noRm,
                    ttl: selectedDetailRecord.ttl,
                    alamat: selectedDetailRecord.alamat,
                    tanggal: selectedDetailRecord.tanggal,
                    dokter: selectedDetailRecord.dokter,
                    triase: selectedDetailRecord.triase || 'Hijau',
                    metodeBayar: selectedDetailRecord.metodeBayar,
                    penjaminan: selectedDetailRecord.penjaminan
                  }));
                  setSelectedItems(selectedDetailRecord.items);
                  setSelectedDetailRecord(null);
                  setTimeout(() => handlePrint(), 100);
                }}
                className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-600" /> Cetak Struk Ini
              </button>
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="print:hidden">
        <KasirFooter />
      </div>
    </div>
  );
}