'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Printer, Search, UserCheck, Activity, LayoutGrid, 
  Pill, RefreshCw, ArrowLeft, Building2, FileSpreadsheet, 
  CheckCircle2, DollarSign, FileText, Calendar, Zap, CheckSquare, Square, ChevronLeft, ChevronRight, ArrowUpDown, Eye, X, HelpCircle, MessageSquare, History, Clock, CreditCard
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface KasirRecord {
  id: string | number;
  tanggal: string;
  no_rm: string;
  nama_pasien: string;
  unit_detail: string;
  penjamin: string;
  total_biaya: number;
  status: string;
  sumber: 'RAJAL' | 'IGD' | 'RANAP' | 'OBAT';
  petugas_nama?: string;
  metode_pembayaran?: string;
}

interface RawKasirItem {
  id: string | number;
  tanggal_transaksi?: string;
  tanggal?: string;
  created_at?: string;
  tanggal_pemeriksaan?: string;
  masuk_tgl?: string;
  no_rm?: string;
  no_reg?: string;
  nama_pasien?: string;
  poli_tujuan?: string;
  triase?: string;
  dokter_pemeriksa?: string;
  ruang?: string;
  dokter_merawat?: string;
  no_sep_bpjs?: string;
  no_transaksi?: string;
  jenis_penjaminan?: string;
  metode_bayar?: string;
  penjaminan?: string;
  penjamin?: string;
  total_biaya?: number;
  total_bayar?: number;
  total_keseluruhan?: number;
  total_biaya_ranap?: number;
  status_bayar?: string;
  status_verifikasi?: string;
  petugas_input_nama?: string;
  petugas_nama?: string;
  metode_pembayaran?: string;
}

interface PrintLogItem {
  id: string | number;
  nama_pasien: string;
  waktu: string;
  tipe: string;
  petugas: string;
}

export default function PusatCetakKasir() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'RAJAL' | 'IGD' | 'RANAP' | 'OBAT'>('RAJAL');
  const [dataList, setDataList] = useState<KasirRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  
  // Filter & Centang Baris
  const [penjaminFilter, setPenjaminFilter] = useState<string>('SEMUA');
  const [petugasFilter, setPetugasFilter] = useState<string>('SEMUA');
  const [shiftFilter, setShiftFilter] = useState<string>('SEMUA'); // SEMUA, PAGI, SORE, MALAM
  const [metodeBayarFilter, setMetodeBayarFilter] = useState<string>('SEMUA');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // State Filter Rentang Tanggal (Date Range)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sorting State
  const [sortField, setSortField] = useState<'tanggal' | 'nama_pasien' | 'total_biaya'>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Paginasi & Opsi Layout Cetak Struk (A4 vs Thermal 80mm)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [printLayoutType, setPrintLayoutType] = useState<'A4' | 'THERMAL'>('A4');

  const [selectedRecord, setSelectedRecord] = useState<KasirRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<KasirRecord | null>(null);
  const [printMode, setPrintMode] = useState<'SINGLE' | 'REKAP' | 'BATCH' | 'SHIFT_REPORT'>('SINGLE');

  // State Modal Bantuan Pintasan, Catatan Kaki, Log Audit, & Rekonsiliasi Shift
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [printCounts, setPrintCounts] = useState<Record<string | number, number>>({});
  const [printLogs, setPrintLogs] = useState<PrintLogItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Deteksi Shift Aktif Berdasarkan Waktu Jam Sekarang
  const detectCurrentShift = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 14) return 'PAGI';
    if (hour >= 14 && hour < 21) return 'SORE';
    return 'MALAM';
  }, []);

  // Global Keyboard Shortcuts (ESC, Ctrl+F, Ctrl+P, Ctrl+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewRecord(null);
        setShowShortcutsModal(false);
        setShowAuditModal(false);
        setShowShiftModal(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintRekap();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchKasirData();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data dari API Backend Route sesuai tab aktif
  const fetchKasirData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedIds([]); 
    setCurrentPage(1);
    try {
      const response = await fetch(`/api/kasir/pusat-cetak?jenis_layanan=${activeTab}`);
      const result = await response.json();

      if (result.success) {
        let results: KasirRecord[] = [];
        const rawData: RawKasirItem[] = result.data || [];

        if (activeTab === 'RAJAL') {
          results = rawData.map((d) => ({
            id: d.id,
            tanggal: d.tanggal_transaksi || d.tanggal || d.created_at || '',
            no_rm: d.no_rm || '-',
            nama_pasien: d.nama_pasien || 'Tanpa Nama',
            unit_detail: d.poli_tujuan || 'Poli Umum',
            penjamin: d.jenis_penjaminan || d.metode_bayar || 'UMUM',
            total_biaya: d.total_biaya || d.total_bayar || 0,
            status: d.status_bayar || 'pending',
            sumber: 'RAJAL',
            petugas_nama: d.petugas_input_nama || 'Petugas Kasir',
            metode_pembayaran: d.metode_pembayaran || 'TUNAI'
          }));
        } 
        else if (activeTab === 'IGD') {
          results = rawData.map((d) => ({
            id: d.id,
            tanggal: d.created_at || d.tanggal_pemeriksaan || '',
            no_rm: d.no_rm || '-',
            nama_pasien: d.nama_pasien || 'Tanpa Nama',
            unit_detail: `Triase: ${d.triase || 'Hijau'} (${d.dokter_pemeriksa || 'Dokter Jaga'})`,
            penjamin: d.penjaminan || d.metode_bayar || 'UMUM',
            total_biaya: d.total_biaya || d.total_keseluruhan || 0,
            status: d.status_bayar || d.status_verifikasi || 'pending',
            sumber: 'IGD',
            petugas_nama: d.petugas_nama || 'Petugas Kasir',
            metode_pembayaran: d.metode_pembayaran || 'TUNAI'
          }));
        }
        else if (activeTab === 'RANAP') {
          results = rawData.map((d) => ({
            id: d.id,
            tanggal: d.masuk_tgl || d.created_at || '',
            no_rm: d.no_reg || '-',
            nama_pasien: d.nama_pasien || 'Tanpa Nama',
            unit_detail: `Ruang: ${d.ruang || '-'} | Dr: ${d.dokter_merawat || '-'}`,
            penjamin: d.no_sep_bpjs ? 'BPJS Kesehatan' : 'UMUM',
            total_biaya: d.total_biaya_ranap || d.total_biaya || 0, 
            status: d.status_verifikasi || 'pending',
            sumber: 'RANAP',
            petugas_nama: d.petugas_nama || 'Petugas Kasir',
            metode_pembayaran: d.metode_pembayaran || 'TRANSFER'
          }));
        }
        else if (activeTab === 'OBAT') {
          results = rawData.map((d) => ({
            id: d.id,
            tanggal: d.created_at || '',
            no_rm: d.no_rm || '-',
            nama_pasien: d.nama_pasien || 'Tanpa Nama',
            unit_detail: `Apotek Resep (${d.no_transaksi || '-'})`,
            penjamin: d.penjamin || 'UMUM',
            total_biaya: d.total_biaya || 0,
            status: d.status_verifikasi || d.status_bayar || 'pending',
            sumber: 'OBAT',
            petugas_nama: d.petugas_nama || 'Petugas Kasir',
            metode_pembayaran: d.metode_pembayaran || 'TUNAI'
          }));
        }

        setDataList(results);
      } else {
        setErrorMessage(result.error || 'Gagal memuat data dari server.');
        setDataList([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data kasir via API:', err);
      setErrorMessage('Terjadi kesalahan jaringan atau server tidak merespons.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchKasirData();
  }, [fetchKasirData]);

  // Daftar unik nama petugas
  const listPetugas = useMemo(() => {
    return Array.from(new Set(dataList.map(item => item.petugas_nama).filter(Boolean))) as string[];
  }, [dataList]);

  // Fungsi Pintasan Tanggal Cepat
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    setStartDate(yesterday);
    setEndDate(yesterday);
    setCurrentPage(1);
  };

  const handleSetThisWeek = () => {
    const now = new Date();
    const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    setStartDate(firstDayOfWeek);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const today = now.toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('SEMUA');
    setPenjaminFilter('SEMUA');
    setPetugasFilter('SEMUA');
    setShiftFilter('SEMUA');
    setMetodeBayarFilter('SEMUA');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Fitur Aksi Pelunasan Cepat (Quick Pay) Langsung
  const handleQuickMarkLunas = (id: string | number) => {
    setDataList(prev => prev.map(item => item.id === id ? { ...item, status: 'lunas' } : item));
    showToast(`Transaksi #${id} berhasil dilunasi secara instan.`);
  };

  // Filter Data (Optimized with useMemo)
  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const matchesSearch = 
        item.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id).toLowerCase().includes(searchTerm.toLowerCase());
       
      let matchesStatus = true;
      if (statusFilter === 'LUNAS') {
        matchesStatus = !!(item.status?.toLowerCase().includes('lunas') || item.status?.toLowerCase().includes('verified'));
      } else if (statusFilter === 'PENDING') {
        matchesStatus = !!(!(item.status?.toLowerCase().includes('lunas') || item.status?.toLowerCase().includes('verified')));
      }

      let matchesPenjamin = true;
      if (penjaminFilter === 'BPJS') {
        matchesPenjamin = item.penjamin?.toLowerCase().includes('bpjs');
      } else if (penjaminFilter === 'UMUM') {
        matchesPenjamin = !item.penjamin?.toLowerCase().includes('bpjs');
      }

      let matchesMetode = true;
      if (metodeBayarFilter !== 'SEMUA') {
        matchesMetode = item.metode_pembayaran?.toLowerCase() === metodeBayarFilter.toLowerCase();
      }

      let matchesPetugas = true;
      if (petugasFilter !== 'SEMUA') {
        matchesPetugas = item.petugas_nama === petugasFilter;
      }

      let matchesShift = true;
      if (shiftFilter !== 'SEMUA' && item.tanggal) {
        const hour = new Date(item.tanggal).getHours();
        if (shiftFilter === 'PAGI') {
          matchesShift = hour >= 7 && hour < 14;
        } else if (shiftFilter === 'SORE') {
          matchesShift = hour >= 14 && hour < 21;
        } else if (shiftFilter === 'MALAM') {
          matchesShift = hour >= 21 || hour < 7;
        }
      }

      let matchesDate = true;
      if (startDate && item.tanggal) {
        matchesDate = matchesDate && new Date(item.tanggal) >= new Date(startDate);
      }
      if (endDate && item.tanggal) {
        matchesDate = matchesDate && new Date(item.tanggal) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesStatus && matchesPenjamin && matchesMetode && matchesPetugas && matchesShift && matchesDate;
    });
  }, [dataList, searchTerm, statusFilter, penjaminFilter, metodeBayarFilter, petugasFilter, shiftFilter, startDate, endDate]);

  // Sorting Logic (Optimized with useMemo)
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'tanggal') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field: 'tanggal' | 'nama_pasien' | 'total_biaya') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Logika Paginasi
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPaginatedData = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  // Handler Centang Baris (Global / Select All Filtered)
  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredData.map(item => item.id);
    const allSelected = allFilteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
      showToast(`Berhasil memilih seluruh ${allFilteredIds.length} data kasir pada filter aktif.`);
    }
  };

  const handleToggleSelectItem = (id: string | number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Hitung Metrik Ringkasan
  const totalNominalFiltered = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  }, [filteredData]);

  const totalLunasCount = useMemo(() => {
    return filteredData.filter(i => i.status?.toLowerCase().includes('lunas') || i.status?.toLowerCase().includes('verified')).length;
  }, [filteredData]);

  const totalBpjsCount = useMemo(() => {
    return filteredData.filter(i => i.penjamin?.toLowerCase().includes('bpjs')).length;
  }, [filteredData]);

  const totalUmumCount = filteredData.length - totalBpjsCount;

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);

  // Aksi Cetak Struk Satuan
  const handlePrintRecord = (record: KasirRecord, layout: 'A4' | 'THERMAL' = 'A4') => {
    setPrintMode('SINGLE');
    setPrintLayoutType(layout);
    setSelectedRecord(record);
    setPrintCounts(prev => ({ ...prev, [record.id]: (prev[record.id] || 0) + 1 }));
     
    setPrintLogs(prev => [
      {
        id: record.id,
        nama_pasien: record.nama_pasien,
        waktu: new Date().toLocaleTimeString('id-ID'),
        tipe: `Struk ${layout} (${record.sumber})`,
        petugas: record.petugas_nama || 'Petugas Kasir'
      },
      ...prev
    ]);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Aksi Cetak Rekapitulasi Laporan Massal
  const handlePrintRekap = () => {
    if (filteredData.length === 0) {
      setErrorMessage('Tidak ada data untuk dicetak sebagai rekap.');
      return;
    }
    setPrintMode('REKAP');
    setPrintLayoutType('A4');
    setSelectedRecord(null);

    setPrintLogs(prev => [
      {
        id: 'REKAP-ALL',
        nama_pasien: `Rekap ${activeTab} (${filteredData.length} data)`,
        waktu: new Date().toLocaleTimeString('id-ID'),
        tipe: 'Laporan Rekap A4',
        petugas: 'Petugas Kasir'
      },
      ...prev
    ]);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Aksi Cetak Batch Terpilih
  const handlePrintBatch = () => {
    if (selectedIds.length === 0) {
      setErrorMessage('Pilih minimal satu data transaksi pada tabel untuk dicetak.');
      return;
    }
    setPrintMode('BATCH');
    setPrintLayoutType('A4');
    setSelectedRecord(null);

    setPrintLogs(prev => [
      {
        id: 'BATCH-SELECTED',
        nama_pasien: `Batch Terpilih (${selectedIds.length} data)`,
        waktu: new Date().toLocaleTimeString('id-ID'),
        tipe: 'Cetak Batch A4',
        petugas: 'Petugas Kasir'
      },
      ...prev
    ]);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Aksi Cetak Laporan Serah Terima Shift Kasir
  const handlePrintShiftClosing = () => {
    setPrintMode('SHIFT_REPORT');
    setPrintLayoutType('A4');
    setShowShiftModal(false);

    setPrintLogs(prev => [
      {
        id: 'SHIFT-CLOSING',
        nama_pasien: `Berita Acara Serah Terima Shift (${shiftFilter === 'SEMUA' ? detectCurrentShift() : shiftFilter})`,
        waktu: new Date().toLocaleTimeString('id-ID'),
        tipe: 'Rekonsiliasi Shift A4',
        petugas: 'Kepala Kasir'
      },
      ...prev
    ]);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Fitur Ekspor ke Format Excel Asli (.xls)
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      setErrorMessage('Tidak ada data untuk diexport.');
      return;
    }
     
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Rekap Billing RSUD Bukit Kerman</title></head>
      <body>
        <h3>REKAPITULASI BILLING & KASIR (${activeTab}) - RSUD BUKIT KERMAN</h3>
        <p>Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'} | Shift: ${shiftFilter}</p>
        <table border="1">
          <thead>
            <tr style="background-color: #008080; color: #ffffff; font-weight: bold;">
              <th>ID Transaksi</th>
              <th>Tanggal</th>
              <th>No. RM</th>
              <th>Nama Pasien</th>
              <th>Unit Detail</th>
              <th>Penjamin</th>
              <th>Metode Bayar</th>
              <th>Total Biaya (Rp)</th>
              <th>Status</th>
              <th>Petugas</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach(row => {
      htmlContent += `
        <tr>
          <td>${row.id}</td>
          <td>${row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-'}</td>
          <td>${row.no_rm}</td>
          <td>${row.nama_pasien}</td>
          <td>${row.unit_detail}</td>
          <td>${row.penjamin}</td>
          <td>${row.metode_pembayaran || 'TUNAI'}</td>
          <td>${row.total_biaya}</td>
          <td>${row.status}</td>
          <td>${row.petugas_nama || '-'}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Billing_${activeTab}_RSUD_Bukit_Kerman.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File Excel rekap berhasil diunduh.');
  };

  const batchSelectedData = useMemo(() => {
    return filteredData.filter(item => selectedIds.includes(item.id));
  }, [filteredData, selectedIds]);

  const totalNominalBatch = useMemo(() => {
    return batchSelectedData.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  }, [batchSelectedData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative">
        
      <style jsx global>{`
        @media print {
          @page {
            size: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? '80mm auto' : 'A4 portrait'};
            margin: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? '0mm' : '10mm 12mm 12mm 12mm'};
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? '7.5pt' : '10pt'} !important;
            font-family: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? "'Courier New', Courier, monospace" : "'Times New Roman', Times, serif"} !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:block {
            display: block !important;
            position: relative !important;
            width: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? '76mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${printMode === 'SINGLE' && printLayoutType === 'THERMAL' ? '2mm 0' : '0'} !important;
          }
          table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-row-group;
          }
        }
      `}</style>

      {/* HEADER KASIR */}
      <div className="print:hidden">
        <KasirHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Pusat Cetak Billing & Operasional Kasir"
        />
      </div>

      {/* TOAST NOTIFIKASI */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-teal-300" /> {toastMessage}
        </div>
      )}

      {/* MODAL PANDUAN PINTASAN KEYBOARD */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-600" /> Panduan Pintasan Keyboard
              </h3>
              <button onClick={() => setShowShortcutsModal(false)} className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-slate-700">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-semibold">Fokus ke Kolom Pencarian</span>
                <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + F</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-semibold">Cetak Rekap / Laporan</span>
                <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + P</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-semibold">Muat Ulang Data Kasir</span>
                <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + R</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-semibold">Tutup Modal / Pratinjau</span>
                <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">ESC</span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOG AUDIT CETAK */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-600" /> Log Audit &amp; Riwayat Cetak Sesi Ini
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {printLogs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Belum ada riwayat aktivitas pencetakan pada sesi ini.</p>
              ) : (
                <div className="space-y-2">
                  {printLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{log.nama_pasien}</p>
                        <p className="text-[10px] text-teal-700 font-mono">ID: {log.id} | Tipe: {log.tipe}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 block">{log.waktu}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{log.petugas}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button 
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Tutup Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REKONSILIASI & TUTUP SHIFT KASIR */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" /> Rekonsiliasi &amp; Berita Acara Tutup Shift
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl text-teal-900 space-y-1">
                <p className="font-bold">Shift Aktif Terdeteksi: <span className="text-teal-700 uppercase underline">{detectCurrentShift()}</span> {shiftFilter !== 'SEMUA' ? `(Filter: ${shiftFilter})` : ''}</p>
                <p className="text-[11px]">Total Transaksi Filtered: <b>{filteredData.length} Data</b></p>
                <p className="text-[11px]">Total Pendapatan Shift: <b className="font-mono text-teal-700">{formatRupiah(totalNominalFiltered)}</b></p>
              </div>
              <p className="text-slate-600 font-medium">Pilih tombol di bawah untuk mencetak Berita Acara Serah Terima Shift Kasir resmi sesuai standar administrasi keuangan RSUD Bukit Kerman.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                Batal
              </button>
              <button 
                onClick={handlePrintShiftClosing}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Berita Acara Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU / PREVIEW STRUK */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Pratinjau Struk / Billing Pasien</h3>
              <button onClick={() => setPreviewRecord(null)} className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
             
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs bg-slate-100/50">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
                  <p className="text-sm font-black uppercase">RSUD BUKIT KERMAN</p>
                  <p className="text-[10px] text-slate-500">Bukti Transaksi ({previewRecord.sumber})</p>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>ID Transaksi:</span> <span className="font-bold">{previewRecord.id}</span></div>
                  <div className="flex justify-between"><span>Tanggal:</span> <span>{previewRecord.tanggal ? new Date(previewRecord.tanggal).toLocaleDateString('id-ID') : '-'}</span></div>
                  <div className="flex justify-between"><span>Nama Pasien:</span> <span className="font-bold">{previewRecord.nama_pasien}</span></div>
                  <div className="flex justify-between"><span>No. RM:</span> <span className="text-teal-700 font-bold">{previewRecord.no_rm}</span></div>
                  <div className="flex justify-between"><span>Unit Layanan:</span> <span>{previewRecord.unit_detail}</span></div>
                  <div className="flex justify-between"><span>Penjamin:</span> <span className="font-bold">{previewRecord.penjamin}</span></div>
                  <div className="flex justify-between"><span>Metode Bayar:</span> <span className="font-bold">{previewRecord.metode_pembayaran || 'TUNAI'}</span></div>
                  <div className="flex justify-between"><span>Status:</span> <span className="uppercase font-bold">{previewRecord.status}</span></div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-teal-800">
                  <span>Total Biaya:</span>
                  <span>{formatRupiah(previewRecord.total_biaya)}</span>
                </div>
              </div>

              {/* INPUT CATATAN KAKI / PESAN KUSTOM PADA STRUK */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 font-sans">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" /> Catatan Tambahan Struk (Opsional)
                </label>
                <input 
                  type="text" 
                  placeholder="Mis: Lunas kontrol poli / Keterangan khusus..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Tekan ESC untuk menutup</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setPreviewRecord(null); handlePrintRecord(previewRecord, 'THERMAL'); }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Cetak Thermal 80mm
                </button>
                <button 
                  onClick={() => { setPreviewRecord(null); handlePrintRecord(previewRecord, 'A4'); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Cetak Format A4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full space-y-6 p-6 md:p-10 flex-1 print:hidden">
          
        {/* NAVIGASI & KETERANGAN */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <button onClick={() => router.push('/kasir')} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard Kasir
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">Pusat Cetak Kasir &amp; Billing Pasien</h1>
              <button 
                onClick={() => setShowShortcutsModal(true)} 
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                title="Bantuan Pintasan Keyboard"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Modul operasional pencetakan struk pembayaran, rincian obat, IGD, dan rawat inap via Backend API.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setShowShiftModal(true)}
              className="px-3.5 py-2 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Rekonsiliasi & Tutup Shift"
            >
              <Clock className="w-3.5 h-3.5 text-teal-600" /> Tutup Shift
            </button>
            <button 
              onClick={() => setShowAuditModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Lihat Log Audit Cetak"
            >
              <History className="w-3.5 h-3.5 text-teal-600" /> Log Cetak ({printLogs.length})
            </button>
            <button 
              onClick={fetchKasirData}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Refresh Data Kasir"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} /> Muat Ulang
            </button>
          </div>
        </div>

        {/* NOTIFIKASI ERROR / ALERT JIKA ADA DENGAN TOMBOL COBA LAGI */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-3 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>⚠️ {errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchKasirData}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
              <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer px-2 py-1">Tutup</button>
            </div>
          </div>
        )}

        {/* TAB FILTER MODUL */}
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'RAJAL', label: 'Rawat Jalan (Rajal)', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'IGD', label: 'Instalasi Gawat Darurat (IGD)', icon: <Activity className="w-4 h-4" /> },
            { id: 'RANAP', label: 'Rawat Inap (Ranap)', icon: <LayoutGrid className="w-4 h-4" /> },
            { id: 'OBAT', label: 'Apotek / Resep Obat', icon: <Pill className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition border shadow-sm cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-teal-600 text-white border-teal-700' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* KARTU STATISTIK & ANALITIK PENJAMIN */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan</p>
              <h3 className="text-sm font-black text-slate-900 font-mono">{formatRupiah(totalNominalFiltered)}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Lunas</p>
              <h3 className="text-sm font-black text-slate-900 font-mono">{totalLunasCount} <span className="text-[10px] text-slate-500 font-normal">data</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl"><Building2 className="w-6 h-6" /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Komposisi Penjamin</p>
              <h3 className="text-xs font-bold text-slate-700">BPJS: {totalBpjsCount} | Umum: {totalUmumCount}</h3>
            </div>
          </div>
           
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Aksi Laporan</span>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{filteredData.length} Baris</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrintRekap} className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm" title="Ctrl+P">
                <FileText className="w-3.5 h-3.5" /> Rekap
              </button>
              <button onClick={handleExportExcel} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* PANEL AKSI BATCH TERPILIH */}
        {selectedIds.length > 0 && (
          <div className="bg-teal-900 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-700 rounded-xl">
                <CheckSquare className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <p className="text-xs font-bold text-teal-200">{selectedIds.length} Transaksi Dipilih</p>
                <p className="text-xs font-mono font-medium">Total Nominal Terpilih: {formatRupiah(totalNominalBatch)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintBatch}
                className="px-4 py-2 bg-white text-teal-900 hover:bg-teal-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Batch Terpilih
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 bg-teal-800 hover:bg-teal-700 text-teal-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batalkan Pilihan
              </button>
            </div>
          </div>
        )}

        {/* SEARCH, STATUS FILTER, PENJAMIN, PETUGAS, SHIFT & DATE RANGE */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-3 w-full sm:max-w-xs bg-white border border-slate-200 px-4 py-2 rounded-xl">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Cari Pasien, No. RM (Ctrl+F)..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs outline-none bg-transparent font-medium"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="LUNAS">Lunas / Verified</option>
                <option value="PENDING">Pending</option>
              </select>

              <select
                value={penjaminFilter}
                onChange={(e) => { setPenjaminFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="SEMUA">Semua Penjamin</option>
                <option value="BPJS">BPJS Kesehatan</option>
                <option value="UMUM">Umum / Lainnya</option>
              </select>

              <select
                value={metodeBayarFilter}
                onChange={(e) => { setMetodeBayarFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="SEMUA">Semua Metode Bayar</option>
                <option value="TUNAI">Tunai (Cash)</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => { setShiftFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-teal-800 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="SEMUA">Semua Shift Kerja</option>
                <option value="PAGI">Shift Pagi (07:00 - 14:00)</option>
                <option value="SORE">Shift Sore (14:00 - 21:00)</option>
                <option value="MALAM">Shift Malam (21:00 - 07:00)</option>
              </select>

              <select
                value={petugasFilter}
                onChange={(e) => { setPetugasFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="SEMUA">Semua Petugas Kasir</option>
                {listPetugas.map((petugas, idx) => (
                  <option key={idx} value={petugas}>{petugas}</option>
                ))}
              </select>

              {/* Tanggal & Pintasan Diperluas */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} 
                    className="outline-none bg-transparent text-xs font-medium text-slate-700 cursor-pointer"
                    title="Tanggal Mulai"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} 
                    className="outline-none bg-transparent text-xs font-medium text-slate-700 cursor-pointer"
                    title="Tanggal Selesai"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <button 
                    onClick={handleSetToday}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Set Filter ke Hari Ini"
                  >
                    <Zap className="w-3 h-3 text-amber-500" /> Hari Ini
                  </button>
                  <button 
                    onClick={handleSetYesterday}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    title="Set Filter ke Kemarin"
                  >
                    Kemarin
                  </button>
                  <button 
                    onClick={handleSetThisWeek}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    title="Set Filter ke Minggu Ini"
                  >
                    Minggu Ini
                  </button>
                  <button 
                    onClick={handleSetThisMonth}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    title="Set Filter ke Bulan Ini"
                  >
                    Bulan Ini
                  </button>
                  {(startDate || endDate || searchTerm || statusFilter !== 'SEMUA' || penjaminFilter !== 'SEMUA' || metodeBayarFilter !== 'SEMUA' || petugasFilter !== 'SEMUA' || shiftFilter !== 'SEMUA') && (
                    <button 
                      onClick={handleResetAllFilters}
                      className="text-[10px] font-bold text-rose-600 hover:underline px-2 py-1"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 whitespace-nowrap">{filteredData.length} Data Ditemukan</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button onClick={handleToggleSelectAll} className="cursor-pointer" title="Pilih Semua Data Filtered">
                      {filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id)) ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('tanggal')}>
                    <div className="flex items-center gap-1">ID / Tanggal <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('nama_pasien')}>
                    <div className="flex items-center gap-1">Pasien &amp; No. RM <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                  </th>
                  <th className="p-4">Keterangan Unit</th>
                  <th className="p-4">Penjamin &amp; Metode</th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('total_biaya')}>
                    <div className="flex items-center justify-end gap-1">Total Biaya <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                  </th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi &amp; Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <tr key={n} className="animate-pulse">
                        <td className="p-4 text-center"><div className="w-4 h-4 bg-slate-200 rounded mx-auto"></div></td>
                        <td className="p-4"><div className="w-20 h-4 bg-slate-200 rounded mb-1"></div><div className="w-12 h-3 bg-slate-100 rounded"></div></td>
                        <td className="p-4"><div className="w-32 h-4 bg-slate-200 rounded mb-1"></div><div className="w-20 h-3 bg-slate-100 rounded"></div></td>
                        <td className="p-4"><div className="w-28 h-4 bg-slate-200 rounded"></div></td>
                        <td className="p-4"><div className="w-16 h-4 bg-slate-200 rounded"></div></td>
                        <td className="p-4 text-right"><div className="w-20 h-4 bg-slate-200 rounded ml-auto"></div></td>
                        <td className="p-4 text-center"><div className="w-16 h-5 bg-slate-200 rounded-full mx-auto"></div></td>
                        <td className="p-4 text-center"><div className="w-24 h-7 bg-slate-200 rounded-xl mx-auto"></div></td>
                      </tr>
                    ))}
                  </>
                ) : currentPaginatedData.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-400">Tidak ada riwayat transaksi pada modul {activeTab}.</td></tr>
                ) : (
                  currentPaginatedData.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const isLunas = item.status?.toLowerCase().includes('lunas') || item.status?.toLowerCase().includes('verified');
                    const printCount = printCounts[item.id] || 0;
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-teal-50/40' : ''}`}>
                        <td className="p-4 text-center">
                          <button onClick={() => handleToggleSelectItem(item.id)} className="cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="p-4 font-mono">
                          <span className="font-bold text-slate-900 block">{item.id}</span>
                          <span className="text-[10px] text-slate-400">
                            {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">{item.nama_pasien}</span>
                          <span className="font-mono text-teal-700 text-[11px]">RM: {item.no_rm || '-'}</span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{item.unit_detail}</td>
                        <td className="p-4">
                          <span className="font-bold block">{item.penjamin}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3 text-teal-600" /> {item.metode_pembayaran || 'TUNAI'}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-teal-700">{formatRupiah(item.total_biaya)}</td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isLunas ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {item.status}
                            </span>
                            {!isLunas && (
                              <button
                                onClick={() => handleQuickMarkLunas(item.id)}
                                className="text-[9px] font-bold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                                title="Lunasi transaksi secara instan"
                              >
                                + Pelunasan Cepat
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPreviewRecord(item)}
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Pratinjau Struk"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePrintRecord(item, 'A4')}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                                title="Cetak Format A4"
                              >
                                <Printer className="w-3.5 h-3.5" /> A4
                              </button>
                              <button
                                onClick={() => handlePrintRecord(item, 'THERMAL')}
                                className="px-2.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                                title="Cetak Struk Thermal 80mm"
                              >
                                Thermal
                              </button>
                            </div>
                            {printCount > 0 && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Dicetak: {printCount}x
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* KONTROL PAGINASI TABEL */}
          {!isLoading && filteredData.length > 0 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl outline-none font-bold text-slate-700 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>dari total {filteredData.length} data</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold">Halaman {currentPage} dari {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================= */}
      {/* TEMPLATE PRINT: OPTIMASI THERMAL, A4, & SHIFT CLOSING REPORT */}
      {/* ========================================================= */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:m-0 print:p-0">
          
        {/* KOP SURAT (A4 / REKAP / SHIFT REPORT) */}
        {((printMode === 'SINGLE' && printLayoutType === 'A4') || printMode === 'REKAP' || printMode === 'BATCH' || printMode === 'SHIFT_REPORT') && (
          <div className="border-b-4 border-double border-black pb-3 mb-4 flex items-center justify-between gap-4 font-serif text-[10pt]">
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <img src="/logo-kerinci.png" alt="Logo Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-center flex-1 space-y-0.5">
              <h3 className="text-[10pt] font-bold tracking-wide uppercase">PEMERINTAH KABUPATEN KERINCI</h3>
              <h2 className="text-[10pt] font-bold tracking-wide uppercase">DINAS KESEHATAN</h2>
              <h1 className="text-[11pt] font-black uppercase tracking-wider">RSUD KELAS D BUKIT KERMAN</h1>
              <p className="text-[8pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
              <p className="text-[7pt]">Website : https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
            </div>
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <img src="/logo-rsud.jpeg" alt="Logo RSUD Bukit Kerman" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}

        {/* KOP KHUSUS STRUK THERMAL 80MM */}
        {printMode === 'SINGLE' && printLayoutType === 'THERMAL' && (
          <div className="text-center space-y-0.5 pb-1 mb-1 border-b border-dashed border-black font-mono text-[7.5pt]">
            <div className="w-10 h-10 mx-auto mb-0.5 flex items-center justify-center">
              <img src="/logo-rsud.jpeg" alt="Logo RSUD Bukit Kerman" className="max-h-full max-w-full object-contain filter grayscale contrast-150" />
            </div>
            <h2 className="text-[8.5pt] font-black uppercase">RSUD BUKIT KERMAN</h2>
            <p className="text-[6.5pt]">Kec. Bukit Kerman, Kab. Kerinci</p>
            <p className="text-[6.5pt] font-bold">STRUK KASIR ({selectedRecord?.sumber})</p>
          </div>
        )}

        {/* KONDISI 1: CETAK STRUK / BILLING SATUAN TERPILIH */}
        {printMode === 'SINGLE' && selectedRecord && (
          <div className={`${printLayoutType === 'THERMAL' ? 'w-[74mm] mx-auto space-y-1 text-[7.5pt] font-mono leading-tight' : 'max-w-xl mx-auto space-y-4 relative pt-2 font-serif text-[10pt]'}`}>
              
            {printLayoutType === 'A4' && (
              <div className="absolute top-12 right-6 border-2 border-black px-4 py-1.5 rounded rotate-[-10deg] pointer-events-none opacity-80">
                <span className="text-xs font-black uppercase tracking-widest font-mono">
                  {selectedRecord.status?.toLowerCase().includes('lunas') || selectedRecord.status?.toLowerCase().includes('verified') ? 'LUNAS / PAID' : 'PENDING / BELUM LUNAS'}
                </span>
              </div>
            )}

            {printLayoutType === 'A4' && (
              <div className="text-center font-bold py-1 space-y-0.5">
                <p className="underline tracking-wider uppercase text-[11pt]">BUKTI PEMBAYARAN &amp; RINCIAN BILLING RESMI</p>
                <p className="text-[9pt] font-mono font-normal">MODUL LAYANAN: {selectedRecord.sumber}</p>
              </div>
            )}

            <div className={`${printLayoutType === 'THERMAL' ? 'space-y-0.5 border-b border-dashed border-black pb-1' : 'text-[10pt] space-y-1.5 font-mono font-bold w-full p-3.5 border-2 border-black rounded bg-slate-50/50'}`}>
              <div className="grid grid-cols-12"><span className="col-span-4">ID/TGL</span><span className="col-span-8">: {selectedRecord.id}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">PASIEN</span><span className="col-span-8">: {selectedRecord.nama_pasien}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">NO. RM</span><span className="col-span-8">: {selectedRecord.no_rm}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">UNIT</span><span className="col-span-8">: {selectedRecord.unit_detail}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">PENJAMIN</span><span className="col-span-8">: {selectedRecord.penjamin}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">BAYAR</span><span className="col-span-8">: {selectedRecord.metode_pembayaran || 'TUNAI'}</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4">STATUS</span><span className="col-span-8 uppercase">: {selectedRecord.status}</span></div>
            </div>

            <div className={`${printLayoutType === 'THERMAL' ? 'space-y-0.5 py-0.5' : 'border-2 border-black p-4 space-y-3'}`}>
              <div className="flex justify-between items-center text-[7.5pt] font-bold border-b border-black pb-0.5 uppercase">
                <span>Uraian Layanan</span>
                <span>Jumlah</span>
              </div>
              <div className="flex justify-between items-center text-[7.5pt] py-0.5">
                <span>Biaya Pelayanan Medis</span>
                <span className="font-mono font-bold">{formatRupiah(selectedRecord.total_biaya)}</span>
              </div>
              <div className="flex justify-between items-center text-[7.5pt] font-black border-t border-black pt-0.5 font-mono">
                <span>TOTAL :</span>
                <span>{formatRupiah(selectedRecord.total_biaya)}</span>
              </div>
            </div>

            {customNote && (
              <div className="p-2 border border-black rounded text-[8pt] font-mono italic">
                <b>Catatan:</b> {customNote}
              </div>
            )}

            {printLayoutType === 'A4' ? (
              <div className="grid grid-cols-2 text-center text-[10pt] pt-8">
                <div className="space-y-14">
                  <p className="font-bold">Pasien / Keluarga Pasien</p>
                  <p className="font-bold">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
                </div>
                <div className="space-y-14">
                  <p className="font-bold">Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Petugas Kasir / Billing</p>
                  <p className="font-bold">( {selectedRecord.petugas_nama || 'Petugas Kasir'} )</p>
                </div>
              </div>
            ) : (
              <div className="text-center pt-2 space-y-1 font-mono text-[6.5pt]">
                <div className="tracking-widest text-[9pt] font-bold">|||| | |||| || | |||||</div>
                <p>ID Verifikasi: #{selectedRecord.id}-{selectedRecord.no_rm}</p>
                <p>Terima Kasih Atas Kunjungan Anda<br/>Sehat Selalu Bersama RSUD Bukit Kerman</p>
                <p className="text-[5.5pt]">{new Date().toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>
        )}

        {/* KONDISI 2: LAPORAN SERAH TERIMA SHIFT KASIR (SHIFT CLOSING REPORT) */}
        {printMode === 'SHIFT_REPORT' && (
          <div className="space-y-4 font-serif text-[10pt]">
            <div className="text-center font-bold py-1 space-y-1">
              <p className="underline tracking-wider uppercase text-[11pt]">BERITA ACARA SERAH TERIMA SHIFT KASIR &amp; REKONSILIASI</p>
              <p className="text-[9pt] font-mono">
                MODUL LAYANAN: {activeTab} | SHIFT: {shiftFilter === 'SEMUA' ? detectCurrentShift() : shiftFilter} | TANGGAL: {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="border border-black p-4 space-y-2 text-[10pt]">
              <div className="grid grid-cols-12"><span className="col-span-4 font-bold">Total Transaksi</span><span className="col-span-8">: {filteredData.length} Berkas Billing</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4 font-bold">Status Lunas</span><span className="col-span-8">: {totalLunasCount} Transaksi Selesai</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4 font-bold">Komposisi BPJS</span><span className="col-span-8">: {totalBpjsCount} Pasien</span></div>
              <div className="grid grid-cols-12"><span className="col-span-4 font-bold">Komposisi Umum</span><span className="col-span-8">: {totalUmumCount} Pasien</span></div>
              <div className="grid grid-cols-12 pt-2 border-t border-black"><span className="col-span-4 font-bold text-[11pt]">TOTAL PENDAPATAN</span><span className="col-span-8 font-mono font-black text-[11pt]">: {formatRupiah(totalNominalFiltered)}</span></div>
            </div>

            <p className="text-[9pt] italic">Demikian berita acara serah terima shift kasir ini dibuat dengan sebenarnya dan ditandatangani oleh petugas shift penyerah dan penerima untuk dipergunakan sebagaimana mestinya.</p>

            <div className="grid grid-cols-2 text-center text-[10pt] pt-12">
              <div className="space-y-16">
                <p className="font-bold">
                  Petugas Shift Penyerah<br/>
                  (Yang Menyerahkan)
                </p>
                <p className="font-bold">
                  ( ______________________________ )<br/>
                  <span className="text-[9pt] font-normal">NIP. ............................................</span>
                </p>
              </div>
              <div className="space-y-16">
                <p className="font-bold">
                  Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                  Petugas Shift Penerima<br/>
                  (Yang Menerima)
                </p>
                <p className="font-bold">
                  ( ______________________________ )<br/>
                  <span className="text-[9pt] font-normal">NIP. ............................................</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KONDISI 3: CETAK REKAPITULASI LAPORAN MASSAL / BATCH */}
        {(printMode === 'REKAP' || printMode === 'BATCH') && (
          <div className="space-y-4 font-serif text-[10pt]">
            <div className="text-center font-bold py-1 space-y-1">
              <p className="underline tracking-wider uppercase text-[11pt]">
                {printMode === 'BATCH' ? 'LAPORAN REKAPITULASI TRANSAKSI TERPILIH (BATCH)' : 'LAPORAN REKAPITULASI PENDAPATAN & BILLING KASIR'}
              </p>
              <p className="text-[9pt] font-mono">
                MODUL LAYANAN: {activeTab} | {printMode === 'BATCH' ? `Terpilih: ${batchSelectedData.length} Data` : `Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`} | TANGGAL CETAK: {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>

            <table className="w-full text-[9pt] border border-black">
              <thead>
                <tr className="bg-slate-200 text-black border-b-2 border-black text-center font-bold">
                  <th className="p-2 border-r border-black w-10">No</th>
                  <th className="p-2 border-r border-black">ID / Tanggal</th>
                  <th className="p-2 border-r border-black">Nama Pasien &amp; RM</th>
                  <th className="p-2 border-r border-black">Unit Detail</th>
                  <th className="p-2 border-r border-black">Penjamin / Bayar</th>
                  <th className="p-2 border-r border-black text-right">Total Biaya</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {(printMode === 'BATCH' ? batchSelectedData : filteredData).map((item, index) => (
                  <tr key={item.id} className="text-black">
                    <td className="p-1.5 border-r border-black text-center">{index + 1}</td>
                    <td className="p-1.5 border-r border-black font-mono">
                      <b>{item.id}</b><br/>
                      <span className="text-[8pt]">{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</span>
                    </td>
                    <td className="p-1.5 border-r border-black">
                      <b>{item.nama_pasien}</b><br/>
                      <span className="text-[8pt] font-mono">RM: {item.no_rm}</span>
                    </td>
                    <td className="p-1.5 border-r border-black">{item.unit_detail}</td>
                    <td className="p-1.5 border-r border-black">
                      <b>{item.penjamin}</b><br/>
                      <span className="text-[7.5pt]">{item.metode_pembayaran || 'TUNAI'}</span>
                    </td>
                    <td className="p-1.5 border-r border-black text-right font-mono font-bold">{formatRupiah(item.total_biaya)}</td>
                    <td className="p-1.5 text-center uppercase font-bold text-[8pt]">{item.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-bold text-black bg-slate-100">
                  <td colSpan={5} className="p-2.5 text-right border-r border-black uppercase text-[9pt]">
                    TOTAL KESELURUHAN PENDAPATAN ({(printMode === 'BATCH' ? batchSelectedData.length : filteredData.length)} Transaksi) :
                  </td>
                  <td colSpan={2} className="p-2.5 text-right font-mono text-[10pt]">
                    {formatRupiah(printMode === 'BATCH' ? totalNominalBatch : totalNominalFiltered)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="grid grid-cols-2 text-center text-[10pt] pt-12">
              <div></div>
              <div className="space-y-16">
                <p className="font-bold">
                  Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                  Penanggung Jawab Kasir RSUD Bukit Kerman
                </p>
                <p className="font-bold">
                  ( ______________________________ )<br/>
                  <span className="text-[9pt] font-normal">NIP. ............................................</span>
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER KASIR */}
      <div className="print:hidden">
        <KasirFooter />
      </div>

    </div>
  );
}