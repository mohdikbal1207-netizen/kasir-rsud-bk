'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Printer, Search, ArrowLeft, Building2, 
  RefreshCw, Filter, Wallet, CheckCircle2, 
  FileSpreadsheet, Calendar, Zap, ArrowUpDown, 
  ChevronLeft, ChevronRight, CheckSquare, Square, 
  History, HelpCircle, X, Layers, Check, Settings, UserCheck, PieChart, ShieldCheck, MessageSquare, Percent, Eye, SlidersHorizontal, Sparkles, Columns, Receipt, QrCode
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface AdminReportRecord {
  id: string | number;
  tanggal_record: string;
  no_rm?: string;
  no_reg?: string;
  nama_pasien: string;
  sumber_modul: string;
  poli_tujuan?: string;
  ruang?: string;
  penjaminan?: string;
  jenis_penjaminan?: string;
  penjamin?: string;
  total_nominal: number;
  status_bayar?: string;
  status_verifikasi?: string;
  metode_bayar?: string;
}

interface PrintLogItem {
  id: string | number;
  nama_pasien: string;
  waktu: string;
  tipe: string;
  petugas: string;
}

export default function PusatCetakAdmin() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
   
  // [OPTIMASI EGRESS & LOG INGESTION]: Ref untuk AbortController guna membatalkan request duplikat/gantung
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // [OPTIMASI EGRESS & LOG INGESTION]: Ref Throttle untuk mencegah spam penulisan log ke server/database agar tidak bengkak
  const lastLogTimestampRef = useRef<{ [key: string]: number }>({});

  const [dataList, setDataList] = useState<AdminReportRecord[]>([]);
  const [summary, setSummary] = useState({ totalTransaksi: 0, grandTotalPendapatan: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Filter Laporan
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [jenisLayanan, setJenisLayanan] = useState<string>('semua');
  const [penjaminFilter, setPenjaminFilter] = useState<string>('semua');
  const [statusBayarFilter, setStatusBayarFilter] = useState<string>('semua');
  const [metodeBayarFilter, setMetodeBayarFilter] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginasi, Sorting, Seleksi Baris, Kerapatan Tabel & Kustomisasi Kolom
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [sortField, setSortField] = useState<'tanggal_record' | 'nama_pasien' | 'total_nominal'>('tanggal_record');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
   
  // Mode Cetak Pintar
  const [printMode, setPrintMode] = useState<'ALL' | 'BATCH' | 'THERMAL'>('ALL');
  const [printLayoutMode, setPrintLayoutMode] = useState<'TABLE' | 'EXECUTIVE_SUMMARY'>('TABLE');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [tableDensity, setTableDensity] = useState<'normal' | 'compact'>('normal');

  // State untuk Struk Termal Individual
  const [activeThermalRecord, setActiveThermalRecord] = useState<AdminReportRecord | null>(null);
  const [showThermalModal, setShowThermalModal] = useState<boolean>(false);

  // State Pengaturan Kolom Tabel yang Ditampilkan
  const [visibleColumns, setVisibleColumns] = useState({
    idTanggal: true,
    modulUnit: true,
    pasienRm: true,
    poliRuang: true,
    penjamin: true,
    nominal: true,
  });

  // State Modal Bantuan, Log Audit, Pengaturan Pejabat, Watermark & Pratinjau
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showSignerModal, setShowSignerModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showColumnModal, setShowColumnModal] = useState<boolean>(false);
  const [printLogs, setPrintLogs] = useState<PrintLogItem[]>([]);

  // State Data Pejabat & Watermark Resmi Rumah Sakit
  const [signerName, setSignerName] = useState<string>('dr. H. Defi Imansyah, M.MH');
  const [signerNip, setSignerNip] = useState<string>('NIP. 19780512 200604 1 008');
  const [watermarkText, setWatermarkText] = useState<string>('DOKUMEN RESMI RSUD BUKIT KERMAN');
  const [remunerasiPersen, setRemunerasiPersen] = useState<number>(40); 
  const [spiAuditStatus, setSpiAuditStatus] = useState<boolean>(true); 

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const formatRupiah = useCallback((num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  }, []);

  // === FUNGSI LOG INGESTION & EGRESS TRACKING DENGAN THROTTLE AMAN ===
  const ingestAuditLog = useCallback(async (actionType: string, targetId: string, description: string) => {
    try {
      const logKey = `${actionType}_${targetId}`;
      const now = Date.now();
      const lastTime = lastLogTimestampRef.current[logKey] || 0;
      
      // Throttle 3 detik untuk mencegah lonjakan/spam penulisan log
      if (now - lastTime < 3000) return;
      lastLogTimestampRef.current[logKey] = now;

      // Non-blocking background log transmission ke server (jika endpoint tersedia)
      fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, target_id: targetId, description, timestamp: new Date().toISOString() })
      }).catch(() => {
        // Fallback aman jika endpoint audit belum aktif sepenuhnya
      });
    } catch (err) {
      console.warn('Audit Log Notice:', err);
    }
  }, []);

  const renderFormattedInsight = useCallback((text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-teal-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }, []);

  const handleSort = useCallback((field: 'tanggal_record' | 'nama_pasien' | 'total_nominal') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // [OPTIMASI EGRESS & LOG INGESTION]: Meneruskan semua filter ke parameter API agar database memfilter di server
  const fetchAdminReportData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setSelectedIds([]);
    setCurrentPage(1);
    try {
      let url = `/api/admin/pusat-cetak?jenis_layanan=${jenisLayanan}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (penjaminFilter !== 'semua') url += `&penjamin=${penjaminFilter}`;
      if (statusBayarFilter !== 'semua') url += `&status_bayar=${statusBayarFilter}`;
      if (metodeBayarFilter !== 'semua') url += `&metode_bayar=${metodeBayarFilter}`;

      const response = await fetch(url, { signal: controller.signal });
      const result = await response.json();

      if (result.success) {
        setDataList(result.data || []);
        setSummary(result.summary || { totalTransaksi: 0, grandTotalPendapatan: 0 });
        showToast('Data laporan berhasil disinkronkan.');
      } else {
        console.error('Gagal memuat laporan admin:', result.error);
        setDataList([]);
        showToast(`Gagal memuat data: ${result.error || 'Kesalahan Server'}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch dibatalkan untuk efisiensi.');
        return;
      }
      console.error('Kesalahan jaringan saat mengambil laporan admin:', err);
      showToast('Koneksi terputus. Gagal memuat laporan admin.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, jenisLayanan, penjaminFilter, statusBayarFilter, metodeBayarFilter, showToast]);

  useEffect(() => {
    fetchAdminReportData();
  }, [fetchAdminReportData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowAuditModal(false);
        setShowSignerModal(false);
        setShowPreviewModal(false);
        setShowColumnModal(false);
        setShowThermalModal(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPrintMode('ALL');
        setShowPreviewModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchAdminReportData();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchAdminReportData]);

  const handleSetToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const handleSetYesterday = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    setStartDate(yesterday);
    setEndDate(yesterday);
  }, []);

  const handleSetThisWeek = useCallback(() => {
    const now = new Date();
    const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    setStartDate(firstDayOfWeek);
    setEndDate(today);
  }, []);

  const handleSetThisMonth = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setStartDate(`${year}-${month}-01`);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const handleSetLastMonth = useCallback(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setStartDate(`${year}-${month}-01`);
    const lastDay = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    setEndDate(lastDay);
  }, []);

  const handleSetTriwulan = useCallback((q: 1 | 2 | 3 | 4) => {
    const year = new Date().getFullYear();
    if (q === 1) { setStartDate(`${year}-01-01`); setEndDate(`${year}-03-31`); }
    else if (q === 2) { setStartDate(`${year}-04-01`); setEndDate(`${year}-06-30`); }
    else if (q === 3) { setStartDate(`${year}-07-01`); setEndDate(`${year}-09-30`); }
    else if (q === 4) { setStartDate(`${year}-10-01`); setEndDate(`${year}-12-31`); }
    showToast(`Filter disesuaikan ke Triwulan ${q} (${year}).`);
  }, [showToast]);

  const handleSetSemester = useCallback((s: 1 | 2) => {
    const year = new Date().getFullYear();
    if (s === 1) { setStartDate(`${year}-01-01`); setEndDate(`${year}-06-30`); }
    else { setStartDate(`${year}-07-01`); setEndDate(`${year}-12-31`); }
    showToast(`Filter disesuaikan ke Semester ${s} (${year}).`);
  }, [showToast]);

  const handleResetFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setJenisLayanan('semua');
    setPenjaminFilter('semua');
    setStatusBayarFilter('semua');
    setMetodeBayarFilter('semua');
    setSearchTerm('');
  }, []);

  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const matchSearch = 
        item.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id).toLowerCase().includes(searchTerm.toLowerCase());
       
      const penjaminStr = (item.penjaminan || item.jenis_penjaminan || item.penjamin || 'UMUM').toUpperCase();
      let matchPenjamin = true;
      if (penjaminFilter === 'bpjs') matchPenjamin = penjaminStr.includes('BPJS');
      else if (penjaminFilter === 'umum') matchPenjamin = penjaminStr.includes('UMUM') || penjaminStr.includes('MANDIRI');
      else if (penjaminFilter === 'lainnya') matchPenjamin = !penjaminStr.includes('BPJS') && !penjaminStr.includes('UMUM') && !penjaminStr.includes('MANDIRI');

      const statusBayarStr = (item.status_bayar || 'LUNAS').toUpperCase();
      let matchStatusBayar = true;
      if (statusBayarFilter === 'lunas') matchStatusBayar = statusBayarStr.includes('LUNAS') || statusBayarStr.includes('SUDAH');
      else if (statusBayarFilter === 'belum') matchStatusBayar = statusBayarStr.includes('BELUM') || statusBayarStr.includes('PENDING');

      const metodeStr = (item.metode_bayar || 'TUNAI').toUpperCase();
      let matchMetode = true;
      if (metodeBayarFilter !== 'semua') {
        matchMetode = metodeStr.includes(metodeBayarFilter.toUpperCase());
      }

      return matchSearch && matchPenjamin && matchStatusBayar && matchMetode;
    });
  }, [dataList, searchTerm, penjaminFilter, statusBayarFilter, metodeBayarFilter]);

  const unitBreakdown = useMemo(() => {
    const breakdown: { [key: string]: { count: number; total: number } } = {};
    let totalFilteredNominal = 0;
    filteredData.forEach(item => {
      const mod = item.sumber_modul || 'Lainnya';
      if (!breakdown[mod]) breakdown[mod] = { count: 0, total: 0 };
      breakdown[mod].count += 1;
      breakdown[mod].total += item.total_nominal || 0;
      totalFilteredNominal += item.total_nominal || 0;
    });
    return { breakdown, totalFilteredNominal };
  }, [filteredData]);

  const paymentHealthStats = useMemo(() => {
    let lunasCount = 0;
    filteredData.forEach(item => {
      const sb = (item.status_bayar || 'LUNAS').toUpperCase();
      if (sb.includes('LUNAS') || sb.includes('SUDAH')) lunasCount++;
    });
    const percentage = filteredData.length > 0 ? ((lunasCount / filteredData.length) * 100).toFixed(1) : '100';
    return { lunasCount, percentage };
  }, [filteredData]);

  const executiveInsightText = useMemo(() => {
    const entries = Object.entries(unitBreakdown.breakdown);
    if (entries.length === 0) return 'Belum ada data transaksi yang cukup untuk dianalisis pada periode ini.';
     
    const sortedUnits = [...entries].sort((a, b) => b[1].total - a[1].total);
    const topUnit = sortedUnits[0];
    const topPercentage = unitBreakdown.totalFilteredNominal > 0 ? ((topUnit[1].total / unitBreakdown.totalFilteredNominal) * 100).toFixed(1) : 0;
     
    return `Analisis Otomatis: Unit **${topUnit[0].toUpperCase()}** menjadi kontributor pendapatan terbesar dengan total **${formatRupiah(topUnit[1].total)}** (${topPercentage}% dari total omset). Rasio pelunasan kas tercatat ${paymentHealthStats.percentage}%. Verifikasi keuangan tervalidasi sistem RSUD Bukit Kerman.`;
  }, [unitBreakdown, paymentHealthStats, formatRupiah]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = (a as any)[sortField] || '';
      let valB: any = (b as any)[sortField] || '';

      if (sortField === 'tanggal_record') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPaginatedData = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleToggleSelectAll = useCallback(() => {
    const allIds = filteredData.map(i => i.id);
    if (allIds.every(id => selectedIds.includes(id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
      showToast(`Memilih seluruh ${allIds.length} data pada laporan.`);
    }
  }, [filteredData, selectedIds, showToast]);

  const handleToggleSelectItem = useCallback((id: string | number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }, []);

  const batchSelectedData = useMemo(() => {
    return filteredData.filter(item => selectedIds.includes(item.id));
  }, [filteredData, selectedIds]);

  const totalNominalBatch = useMemo(() => {
    return batchSelectedData.reduce((acc, curr) => acc + (curr.total_nominal || 0), 0);
  }, [batchSelectedData]);

  const dataToPrint = printMode === 'BATCH' ? batchSelectedData : filteredData;
  const totalNominalPrint = printMode === 'BATCH' ? totalNominalBatch : unitBreakdown.totalFilteredNominal;

  const handleSendWhatsApp = useCallback(() => {
    const text = `*RINGKASAN LAPORAN KEUANGAN RSUD BUKIT KERMAN* %0A` +
      `📅 Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}%0A` +
      `📊 Total Transaksi: ${filteredData.length} Berkas%0A` +
      `💰 Grand Total: ${formatRupiah(unitBreakdown.totalFilteredNominal)}%0A` +
      `⚖️ Estimasi Remunerasi (${remunerasiPersen}%): ${formatRupiah((unitBreakdown.totalFilteredNominal * remunerasiPersen) / 100)}%0A` +
      `🛡️ Status Audit SPI: ${spiAuditStatus ? 'TELAH DIAUDIT & VALID' : 'BELUM DIPERIKSA'}%0A` +
      `_Diciptakan secara otomatis dari Pusat Cetak Admin SIMRS._`;
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    
    // Ingest Egress log for WhatsApp sharing
    ingestAuditLog('EGRESS_WHATSAPP_SUMMARY', 'SYSTEM', `Financial summary sent via WhatsApp. Total records: ${filteredData.length}`);
  }, [startDate, endDate, filteredData.length, unitBreakdown.totalFilteredNominal, remunerasiPersen, spiAuditStatus, formatRupiah, ingestAuditLog]);

  const handlePrintAction = useCallback((mode: 'ALL' | 'BATCH' | 'THERMAL') => {
    if (mode === 'BATCH' && selectedIds.length === 0) {
      showToast('Pilih minimal satu data pada tabel untuk cetak batch.');
      return;
    }
    setPrintMode(mode);
    setPrintLogs(prev => [
      {
        id: mode === 'BATCH' ? 'BATCH-SELECTED' : mode === 'THERMAL' ? `STRUK-${activeThermalRecord?.id}` : 'LAPORAN-EXECUTIVE',
        nama_pasien: mode === 'BATCH' ? `Batch Terpilih (${selectedIds.length} Data)` : mode === 'THERMAL' ? `Struk ${activeThermalRecord?.nama_pasien}` : `Rekapitulasi Manajerial (${filteredData.length} Data)`,
        waktu: new Date().toLocaleTimeString('id-ID'),
        tipe: mode === 'BATCH' ? 'Cetak Batch Eksekutif' : mode === 'THERMAL' ? 'Cetak Struk Termal' : 'Laporan Cetak Eksekutif',
        petugas: 'Admin Pusat'
      },
      ...prev
    ]);
    setShowPreviewModal(false);
    setShowThermalModal(false);
     
    // Ingest Log for Print Action
    ingestAuditLog('PRINT_REPORT', mode, `Print action executed in mode: ${mode}`);

    setTimeout(() => {
      window.print();
    }, 500);
  }, [selectedIds.length, activeThermalRecord, filteredData.length, showToast, ingestAuditLog]);

  const handleOpenThermalReceipt = useCallback((item: AdminReportRecord) => {
    setActiveThermalRecord(item);
    setShowThermalModal(true);
  }, []);

  const handleOpenSingleFormPreview = useCallback((item: AdminReportRecord) => {
    setActiveThermalRecord(item);
    setShowPreviewModal(true);
  }, []);

  const handleExportExcel = useCallback(() => {
    if (filteredData.length === 0) {
      showToast('Tidak ada data untuk diexport.');
      return;
    }

    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Laporan Manajerial RSUD Bukit Kerman</title></head>
      <body>
        <h3>LAPORAN REKAPITULASI KEUANGAN & MANAJERIAL - RSUD BUKIT KERMAN</h3>
        <p>Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'} | Unit: ${jenisLayanan} | Penjamin: ${penjaminFilter} | Status SPI: ${spiAuditStatus ? 'Telah Diaudit' : 'Belum'}</p>
        <table border="1">
          <thead>
            <tr style="background-color: #008080; color: #ffffff; font-weight: bold;">
              <th>ID Transaksi</th>
              <th>Tanggal</th>
              <th>Modul Unit</th>
              <th>No. RM / Reg</th>
              <th>Nama Pasien</th>
              <th>Keterangan / Poli / Ruang</th>
              <th>Penjamin</th>
              <th>Status Bayar</th>
              <th>Nominal Biaya (Rp)</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach(row => {
      htmlContent += `
        <tr>
          <td>${row.id}</td>
          <td>${row.tanggal_record ? new Date(row.tanggal_record).toLocaleDateString('id-ID') : '-'}</td>
          <td>${row.sumber_modul}</td>
          <td>${row.no_rm || row.no_reg || '-'}</td>
          <td>${row.nama_pasien || 'Tanpa Nama'}</td>
          <td>${row.poli_tujuan || row.ruang || '-'}</td>
          <td>${row.penjaminan || row.jenis_penjaminan || row.penjamin || 'UMUM'}</td>
          <td>${row.status_bayar || 'LUNAS'}</td>
          <td>${row.total_nominal}</td>
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
    link.download = `Laporan_Manajerial_RSUD_Bukit_Kerman.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File Excel laporan berhasil diunduh.');

    // Ingest Egress log for Excel export
    ingestAuditLog('DATA_EGRESS_EXCEL_EXPORT', 'SYSTEM_BULK', `Financial report exported to Excel. Total records: ${filteredData.length}`);
  }, [filteredData, startDate, endDate, jenisLayanan, penjaminFilter, spiAuditStatus, showToast, ingestAuditLog]);

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: ${printMode === 'THERMAL' ? '80mm auto' : `A4 ${printOrientation}`};
            margin: ${printMode === 'THERMAL' ? '2mm' : '10mm 15mm'};
          }
          body, html {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
           
          #app-screen-ui {
            display: none !important;
          }

          #print-document-ui {
            display: block !important;
            width: 100%;
          }

          .print-watermark {
            position: fixed;
            top: 45%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 42pt;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.05);
            z-index: -1000;
            pointer-events: none;
            white-space: nowrap;
            text-transform: uppercase;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto; 
          }
          tr {
            page-break-inside: avoid; 
            page-break-after: auto;
          }
          thead {
            display: table-header-group; 
          }
          tfoot {
            display: table-footer-group; 
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            color: #000 !important;
            font-size: 9pt !important;
          }
        }
      `}</style>

      <div id="app-screen-ui" role="main" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative pb-24 print:hidden">
         
        {toastMessage && (
          <div role="alert" aria-live="assertive" className="fixed bottom-6 right-6 z-50 bg-teal-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-teal-300" /> {toastMessage}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-bounce-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xs">
                {selectedIds.length}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Berkas Terpilih</p>
                <p className="text-[10px] font-mono text-teal-300">{formatRupiah(totalNominalBatch)}</p>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintAction('BATCH')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Batch Terpilih
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {showThermalModal && activeThermalRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-teal-600" /> Pratinjau Struk Termal Kasir
                </h3>
                <button onClick={() => setShowThermalModal(false)} aria-label="Tutup pratinjau" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-slate-100 overflow-y-auto max-h-[70vh] flex justify-center">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-300 w-72 font-mono text-[11px] text-black space-y-3">
                  <div className="text-center space-y-1 border-b border-dashed border-black pb-2">
                    <img src="/logo-rsud.jpeg" alt="Logo RSUD Bukit Kerman" className="w-10 h-10 object-contain mx-auto mb-1" />
                    <p className="font-bold text-xs">RSUD BUKIT KERMAN</p>
                    <p className="text-[9px]">Kabupaten Kerinci, Jambi</p>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>No. Trans:</span> <span className="font-bold">{activeThermalRecord.id}</span></div>
                    <div className="flex justify-between"><span>Tanggal:</span> <span>{activeThermalRecord.tanggal_record ? new Date(activeThermalRecord.tanggal_record).toLocaleDateString('id-ID') : '-'}</span></div>
                    <div className="flex justify-between"><span>Unit Modul:</span> <span className="uppercase font-bold">{activeThermalRecord.sumber_modul}</span></div>
                    <div className="flex justify-between"><span>Nama Pasien:</span> <span className="font-bold">{activeThermalRecord.nama_pasien}</span></div>
                    <div className="flex justify-between"><span>No. RM / Reg:</span> <span>{activeThermalRecord.no_rm || activeThermalRecord.no_reg || '-'}</span></div>
                    <div className="flex justify-between"><span>Poli / Ruang:</span> <span>{activeThermalRecord.poli_tujuan || activeThermalRecord.ruang || '-'}</span></div>
                    <div className="flex justify-between"><span>Penjamin:</span> <span>{activeThermalRecord.penjaminan || activeThermalRecord.penjamin || 'UMUM'}</span></div>
                  </div>

                  <div className="border-t border-b border-dashed border-black py-2 space-y-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span>TOTAL BIAYA:</span>
                      <span>{formatRupiah(activeThermalRecord.total_nominal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>Status Pembayaran:</span>
                      <span className="font-bold uppercase">{activeThermalRecord.status_bayar || 'LUNAS'}</span>
                    </div>
                  </div>

                  <div className="text-center text-[9px] space-y-1 pt-1">
                    <p>Terima kasih atas kunjungan Anda</p>
                    <p className="font-bold">Layanan Kesehatan Prima &amp; Bermutu</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Format Struk Kasir / Printer POS 80mm</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowThermalModal(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                    Tutup
                  </button>
                  <button onClick={() => handlePrintAction('THERMAL')} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Printer className="w-4 h-4" /> Cetak Struk
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showColumnModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Columns className="w-4 h-4 text-teal-600" /> Kustomisasi Kolom Tabel
                </h3>
                <button onClick={() => setShowColumnModal(false)} aria-label="Tutup kustomisasi kolom" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3 text-xs">
                <p className="text-slate-500 text-[11px]">Pilih kolom yang ingin ditampilkan pada tabel laporan:</p>
                {[
                  { key: 'idTanggal', label: 'ID & Tanggal Transaksi' },
                  { key: 'modulUnit', label: 'Modul / Unit Layanan' },
                  { key: 'pasienRm', label: 'Nama Pasien & No. RM' },
                  { key: 'poliRuang', label: 'Keterangan Poli / Ruang' },
                  { key: 'penjamin', label: 'Penjamin Pasien' },
                  { key: 'nominal', label: 'Nominal Biaya' },
                ].map(col => (
                  <label key={col.key} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                    <span className="font-bold text-slate-700">{col.label}</span>
                    <input 
                      type="checkbox"
                      checked={(visibleColumns as any)[col.key]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                      className="w-4 h-4 accent-teal-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button onClick={() => { setShowColumnModal(false); showToast('Pengaturan kolom diperbarui.'); }} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}

        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-teal-600" /> Pratinjau Dokumen Cetak Rekapitulasi Laporan (Mode: {printMode})
                </h3>
                <button onClick={() => setShowPreviewModal(false)} aria-label="Tutup pratinjau dokumen" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
               
              <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-slate-100 font-serif text-xs text-black">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-300 space-y-4 mx-auto max-w-2xl">
                  <div className="flex items-center justify-between border-b-4 border-double border-black pb-3 gap-4">
                    <img src="/logo-pemkab.png" alt="Logo Pemkab Kerinci" className="w-14 h-14 object-contain" />
                    <div className="text-center flex-1 space-y-0.5">
                      <p className="font-bold text-[9px] tracking-wide">PEMERINTAH KABUPATEN KERINCI</p>
                      <p className="text-[10px] font-bold tracking-wide">DINAS KESEHATAN</p>
                      <h2 className="text-xs font-black uppercase tracking-wider">RSUD BUKIT KERMAN</h2>
                      <p className="text-[8px]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                    </div>
                    <img src="/logo-rsud.jpeg" alt="Logo RSUD Bukit Kerman" className="w-14 h-14 object-contain" />
                  </div>

                  <div className="text-center pt-2">
                    <h3 className="text-xs font-bold underline uppercase">
                      {printMode === 'BATCH' ? 'Laporan Rekapitulasi Keuangan Terpilih (Batch)' : 'Laporan Rekapitulasi Keuangan Lintas Unit'}
                    </h3>
                  </div>

                  <div className="flex justify-between text-[10px]">
                    <div>
                      <p><strong>Periode:</strong> {startDate || 'Semua'} s/d {endDate || 'Semua'}</p>
                      <p><strong>Status Audit SPI:</strong> {spiAuditStatus ? 'Telah Diaudit & Valid' : 'Belum Diperiksa'}</p>
                    </div>
                    <div className="text-right">
                      <p><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                      <p><strong>Total Berkas:</strong> {dataToPrint.length} Data</p>
                    </div>
                  </div>

                  <table className="border border-black w-full text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 border-b border-black text-black">
                        <th className="p-1.5 border-r border-black">ID</th>
                        <th className="p-1.5 border-r border-black">Tanggal</th>
                        <th className="p-1.5 border-r border-black">Unit</th>
                        <th className="p-1.5 border-r border-black">Pasien / RM</th>
                        <th className="p-1.5 border-r border-black">Penjamin</th>
                        <th className="p-1.5 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataToPrint.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-300">
                          <td className="p-1.5 border-r border-black font-mono">{item.id}</td>
                          <td className="p-1.5 border-r border-black">{item.tanggal_record ? new Date(item.tanggal_record).toLocaleDateString('id-ID') : '-'}</td>
                          <td className="p-1.5 border-r border-black uppercase font-bold">{item.sumber_modul}</td>
                          <td className="p-1.5 border-r border-black">{item.nama_pasien}</td>
                          <td className="p-1.5 border-r border-black">{item.penjaminan || item.penjamin || 'UMUM'}</td>
                          <td className="p-1.5 text-right font-mono">{formatRupiah(item.total_nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-black">
                        <td colSpan={5} className="p-1.5 border-r border-black text-right uppercase">TOTAL PENDAPATAN :</td>
                        <td className="p-1.5 text-right font-mono">{formatRupiah(totalNominalPrint)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="pt-6 grid grid-cols-2 text-center items-end">
                    <div className="text-left flex items-center gap-2">
                      <QrCode className="w-12 h-12 text-slate-700" />
                      <span className="text-[8px] text-slate-500 font-mono">Validasi SPI RSUD<br />ID: {Date.now()}</span>
                    </div>
                    <div className="space-y-12">
                      <p>Kerinci, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      <p className="font-bold">Direktur / Penanggung Jawab RSUD<br />Kabupaten Kerinci</p>
                      <div className="pt-2">
                        <p className="font-bold underline">{signerName}</p>
                        <p className="font-mono text-[9px]">{signerNip}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Pratinjau tampilan sebelum dicetak fisik.</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">
                    Tutup
                  </button>
                  <button onClick={() => handlePrintAction(printMode)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Printer className="w-4 h-4" /> Cetak Sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-600" /> Panduan Pintasan Keyboard Admin
                </h3>
                <button onClick={() => setShowShortcutsModal(false)} aria-label="Tutup panduan pintasan" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3 text-xs text-slate-700">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="font-semibold">Fokus ke Pencarian</span>
                  <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + F</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="font-semibold">Cetak Laporan Semua</span>
                  <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + P</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="font-semibold">Sinkronkan Data</span>
                  <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">Ctrl + R</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="font-semibold">Tutup Jendela / Modal</span>
                  <span className="px-2.5 py-1 bg-slate-100 font-mono font-bold rounded-lg border border-slate-200">ESC</span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button onClick={() => setShowShortcutsModal(false)} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}

        {showAuditModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" /> Log Riwayat Cetak Eksekutif
                </h3>
                <button onClick={() => setShowAuditModal(false)} aria-label="Tutup riwayat cetak" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
                {printLogs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Belum ada aktivitas pencetakan laporan pada sesi ini.</p>
                ) : (
                  <div className="space-y-2">
                    {printLogs.map((log, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{log.nama_pasien}</p>
                          <p className="text-[10px] text-teal-700 font-mono">Tipe: {log.tipe}</p>
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
                <button onClick={() => setShowAuditModal(false)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                  Tutup Log
                </button>
              </div>
            </div>
          </div>
        )}

        {showSignerModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-fadeIn flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600" /> Pengaturan Pejabat &amp; Smart Print
                </h3>
                <button onClick={() => setShowSignerModal(false)} aria-label="Tutup pengaturan pejabat" className="p-1 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600" htmlFor="inputSignerName">Nama &amp; Gelar Pejabat / Direktur</label>
                  <input 
                    id="inputSignerName"
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600" htmlFor="inputSignerNip">NIP Pejabat</label>
                  <input 
                    id="inputSignerNip"
                    type="text"
                    value={signerNip}
                    onChange={(e) => setSignerNip(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600" htmlFor="inputWatermark">Teks Watermark Cetak</label>
                  <input 
                    id="inputWatermark"
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Status Validasi SPI</p>
                    <p className="text-[10px] text-slate-500">Tandai laporan telah diaudit Satuan Pengawas Internal</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={spiAuditStatus}
                    onChange={(e) => setSpiAuditStatus(e.target.checked)}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                    aria-label="Toggle validasi SPI"
                  />
                </div>
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-slate-600">Orientasi Kertas Cetak</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPrintOrientation('portrait')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition ${printOrientation === 'portrait' ? 'bg-teal-600 text-white border-teal-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      Portrait (Tegak)
                    </button>
                    <button 
                      onClick={() => setPrintOrientation('landscape')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition ${printOrientation === 'landscape' ? 'bg-teal-600 text-white border-teal-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      Landscape (Mendatar)
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button onClick={() => setShowSignerModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer">
                  Batal
                </button>
                <button onClick={() => { setShowSignerModal(false); showToast('Pengaturan cetak & pejabat berhasil disimpan.'); }} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition cursor-pointer shadow-sm">
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Pusat Cetak Laporan Manajerial &amp; Audit Eksekutif"
          badgeText="Admin Pusat"
        />

        <div className="max-w-7xl mx-auto w-full space-y-6 p-6 md:p-10 flex-1">
           
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/admin')} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard Admin
                </button>
                <button onClick={() => setShowShortcutsModal(true)} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer" aria-label="Bantuan Pintasan" title="Bantuan Pintasan">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Pusat Cetak Laporan Manajerial &amp; Audit</h1>
              <p className="text-xs text-slate-500 font-medium">Rekapitulasi omset global rumah sakit lintas unit berdasarkan filter tanggal dan layanan.</p>
            </div>
             
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setShowColumnModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Columns className="w-3.5 h-3.5 text-teal-600" /> Kolom
              </button>
              <button 
                onClick={() => { setPrintMode('ALL'); setShowPreviewModal(true); }}
                className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" /> Pratinjau
              </button>
              <button 
                onClick={handleSendWhatsApp}
                className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button 
                onClick={() => setShowSignerModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Settings className="w-3.5 h-3.5 text-teal-600" /> Pejabat
              </button>
              <button 
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <History className="w-3.5 h-3.5 text-teal-600" /> Log ({printLogs.length})
              </button>
              <button 
                onClick={fetchAdminReportData}
                disabled={isLoading}
                className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} /> Sinkronkan
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button 
                onClick={() => handlePrintAction('ALL')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Rekap
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-md flex items-center gap-4">
            <div className="p-3 bg-teal-800 rounded-2xl text-teal-200 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-teal-300 uppercase tracking-wider text-[10px]">Ringkasan Analisis Keuangan Cerdas</p>
              <p className="text-slate-200 font-medium leading-relaxed">{renderFormattedInsight(executiveInsightText)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">Grand Total Pendapatan</span>
                <h3 className="text-xl font-black font-mono">{formatRupiah(unitBreakdown.totalFilteredNominal)}</h3>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Akumulasi seluruh unit layanan
                </p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Estimasi Jasa Layanan / Remunerasi ({remunerasiPersen}%)</span>
                <h3 className="text-xl font-black text-teal-700 font-mono">{formatRupiah((unitBreakdown.totalFilteredNominal * remunerasiPersen) / 100)}</h3>
                <p className="text-[10px] text-slate-500">Alokasi proporsional BLUD untuk pegawai</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
                <Percent className="w-6 h-6 text-teal-600" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Status Audit SPI</span>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className={`w-5 h-5 ${spiAuditStatus ? 'text-emerald-600' : 'text-amber-500'}`} />
                  {spiAuditStatus ? 'Valid & Diaudit' : 'Belum Diperiksa'}
                </h3>
                <p className="text-[10px] text-slate-500">Pengawasan Keuangan Internal</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
                <Building2 className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(unitBreakdown.breakdown).map(([modName, stats], idx) => {
              const percentage = unitBreakdown.totalFilteredNominal > 0 ? ((stats.total / unitBreakdown.totalFilteredNominal) * 100).toFixed(1) : '0';
              return (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{modName}</span>
                    <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">{percentage}%</span>
                  </div>
                  <p className="text-sm font-black font-mono text-slate-900">{formatRupiah(stats.total)}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-500">{stats.count} Transaksi</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                <Filter className="w-4 h-4 text-teal-600" /> Filter Laporan Manajerial &amp; Periode BLUD
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={handleSetToday} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer">
                  <Zap className="w-3 h-3 text-amber-500" /> Hari Ini
                </button>
                <button onClick={handleSetYesterday} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer">
                  Kemarin
                </button>
                <button onClick={handleSetThisWeek} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer">
                  Minggu Ini
                </button>
                <button onClick={handleSetThisMonth} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer">
                  Bulan Ini
                </button>
                <button onClick={handleSetLastMonth} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition cursor-pointer">
                  Bulan Lalu
                </button>
                <button onClick={() => handleSetTriwulan(1)} className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-teal-200">
                  TW I
                </button>
                <button onClick={() => handleSetTriwulan(2)} className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-teal-200">
                  TW II
                </button>
                <button onClick={() => handleSetTriwulan(3)} className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-teal-200">
                  TW III
                </button>
                <button onClick={() => handleSetTriwulan(4)} className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-teal-200">
                  TW IV
                </button>
                <button onClick={() => handleSetSemester(1)} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-indigo-200">
                  Semester I
                </button>
                <button onClick={() => handleSetSemester(2)} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-[10px] font-bold transition cursor-pointer border border-indigo-200">
                  Semester II
                </button>
                {(startDate || endDate || jenisLayanan !== 'semua' || penjaminFilter !== 'semua' || statusBayarFilter !== 'semua' || metodeBayarFilter !== 'semua' || searchTerm) && (
                  <button onClick={handleResetFilters} className="text-[10px] font-bold text-rose-600 hover:underline px-2 py-1 cursor-pointer">
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400">Pilih Cepat Unit:</span>
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'rawat_jalan', label: 'Rawat Jalan' },
                { id: 'igd', label: 'IGD' },
                { id: 'ranap', label: 'Rawat Inap' },
                { id: 'obat', label: 'Apotek' },
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setJenisLayanan(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                    jenisLayanan === chip.id
                      ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500" htmlFor="filterStartDate">Dari Tanggal</label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    id="filterStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500" htmlFor="filterEndDate">Sampai Tanggal</label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    id="filterEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500" htmlFor="filterJenisLayanan">Unit / Jenis Layanan</label>
                <select
                  id="filterJenisLayanan"
                  value={jenisLayanan}
                  onChange={(e) => setJenisLayanan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="semua">Semua Unit Layanan</option>
                  <option value="rawat_jalan">Rawat Jalan (Rajal)</option>
                  <option value="igd">Instalasi Gawat Darurat (IGD)</option>
                  <option value="ranap">Rawat Inap (Ranap)</option>
                  <option value="obat">Apotek / Resep Obat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500" htmlFor="filterSearch">Cari Pasien / ID (Ctrl+F)</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    id="filterSearch"
                    ref={searchInputRef}
                    type="text"
                    placeholder="Nama / No. RM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500">Menampilkan {filteredData.length} Rekaman Data Laporan</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                  <button 
                    onClick={() => setTableDensity('normal')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${tableDensity === 'normal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    Normal
                  </button>
                  <button 
                    onClick={() => setTableDensity('compact')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${tableDensity === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    Kompak
                  </button>
                </div>
                <span className="text-xs font-mono text-teal-700 font-bold">RSUD Bukit Kerman</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-12 text-center">
                      <button onClick={handleToggleSelectAll} className="cursor-pointer" aria-label="Pilih Semua Data" title="Pilih Semua">
                        {filteredData.length > 0 && filteredData.every(i => selectedIds.includes(i.id)) ? (
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    {visibleColumns.idTanggal && (
                      <th className="p-3.5 cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('tanggal_record')} aria-label="Urutkan berdasarkan tanggal">
                        <div className="flex items-center gap-1">ID / Tanggal <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                      </th>
                    )}
                    {visibleColumns.modulUnit && <th className="p-3.5">Modul Unit</th>}
                    {visibleColumns.pasienRm && (
                      <th className="p-3.5 cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('nama_pasien')} aria-label="Urutkan berdasarkan nama pasien">
                        <div className="flex items-center gap-1">Pasien &amp; No. RM <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                      </th>
                    )}
                    {visibleColumns.poliRuang && <th className="p-3.5">Keterangan / Poli / Ruang</th>}
                    {visibleColumns.penjamin && <th className="p-3.5">Penjamin</th>}
                    {visibleColumns.nominal && (
                      <th className="p-3.5 text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => handleSort('total_nominal')} aria-label="Urutkan berdasarkan nominal">
                        <div className="flex items-center justify-end gap-1">Nominal Biaya <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                      </th>
                    )}
                    <th className="p-3.5 text-center">Aksi Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isLoading ? (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" /> Memuat laporan eksekutif...</td></tr>
                  ) : currentPaginatedData.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-400">Tidak ada data rekapitulasi yang sesuai dengan filter.</td></tr>
                  ) : (
                    currentPaginatedData.map((item, idx) => {
                      const isSelected = selectedIds.includes(item.id);
                      const sumber = item.sumber_modul?.toLowerCase() || '';
                      const badgeColor = sumber.includes('rajal') ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                         sumber.includes('igd') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                         sumber.includes('ranap') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                         'bg-amber-50 text-amber-700 border-amber-200';
                      const paddingClass = tableDensity === 'compact' ? 'py-2 px-3.5' : 'p-3.5';

                      return (
                        <tr key={`${item.id}-${idx}`} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-teal-50/40' : ''}`}>
                          <td className={`${paddingClass} text-center`}>
                            <button onClick={() => handleToggleSelectItem(item.id)} className="cursor-pointer" aria-label={`Pilih baris ${item.id}`}>
                              {isSelected ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                            </button>
                          </td>
                          {visibleColumns.idTanggal && (
                            <td className={`${paddingClass} font-mono`}>
                              <span className="font-bold text-slate-900 block">{item.id}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.tanggal_record ? new Date(item.tanggal_record).toLocaleDateString('id-ID') : '-'}
                              </span>
                            </td>
                          )}
                          {visibleColumns.modulUnit && (
                            <td className={paddingClass}>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${badgeColor}`}>
                                {item.sumber_modul}
                              </span>
                            </td>
                          )}
                          {visibleColumns.pasienRm && (
                            <td className={paddingClass}>
                              <span className="font-bold text-slate-900 block">{item.nama_pasien || 'Tanpa Nama'}</span>
                              <span className="font-mono text-teal-700 text-[11px]">RM: {item.no_rm || item.no_reg || '-'}</span>
                            </td>
                          )}
                          {visibleColumns.poliRuang && (
                            <td className={`${paddingClass} text-slate-600`}>
                              {item.poli_tujuan || item.ruang || '-'}
                            </td>
                          )}
                          {visibleColumns.penjamin && (
                            <td className={`${paddingClass} font-bold`}>
                              {item.penjaminan || item.jenis_penjaminan || item.penjamin || 'UMUM'}
                            </td>
                          )}
                          {visibleColumns.nominal && (
                            <td className={`${paddingClass} text-right font-mono font-black text-teal-700`}>
                              {formatRupiah(item.total_nominal)}
                            </td>
                          )}
                          <td className={`${paddingClass} text-center`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenThermalReceipt(item)}
                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl transition cursor-pointer shadow-sm inline-flex items-center gap-1 text-[10px] font-bold"
                                title="Cetak Struk Kasir Termal"
                                aria-label={`Cetak struk termal ${item.id}`}
                              >
                                <Receipt className="w-3.5 h-3.5" /> Struk
                              </button>
                              <button
                                onClick={() => handleOpenSingleFormPreview(item)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shadow-sm inline-flex items-center gap-1 text-[10px] font-bold"
                                title="Pratinjau / Cetak Lembar Form"
                                aria-label={`Pratinjau form ${item.id}`}
                              >
                                <Printer className="w-3.5 h-3.5 text-teal-600" /> Form
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

            {!isLoading && filteredData.length > 0 && (
              <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <label htmlFor="selectItemsPerPage">Tampilkan:</label>
                  <select 
                    id="selectItemsPerPage"
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl outline-none font-bold text-slate-700 cursor-pointer"
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
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
                      aria-label="Halaman sebelumnya"
                      className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      aria-label="Halaman berikutnya"
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

        <AdminFooter />
      </div>

      <div id="print-document-ui" className="hidden print:block text-black bg-white w-full">
         
        <div className="print-watermark">{watermarkText}</div>

        {printMode === 'THERMAL' && activeThermalRecord ? (
           
          <div className="font-mono text-[9pt] p-1 w-[75mm] mx-auto">
            <div className="text-center mb-2 border-b border-dashed border-black pb-2">
              <p className="font-bold">RSUD BUKIT KERMAN</p>
              <p className="text-[8pt]">Kabupaten Kerinci, Jambi</p>
            </div>
            <div className="space-y-1 mb-2">
              <div>Trans: {activeThermalRecord.id}</div>
              <div>Tgl: {activeThermalRecord.tanggal_record ? new Date(activeThermalRecord.tanggal_record).toLocaleDateString('id-ID') : '-'}</div>
              <div>Modul: {activeThermalRecord.sumber_modul}</div>
              <div>Pasien: {activeThermalRecord.nama_pasien}</div>
              <div>RM/Reg: {activeThermalRecord.no_rm || activeThermalRecord.no_reg || '-'}</div>
              <div>Poli/Rg: {activeThermalRecord.poli_tujuan || activeThermalRecord.ruang || '-'}</div>
              <div>Jaminan: {activeThermalRecord.penjaminan || activeThermalRecord.penjamin || 'UMUM'}</div>
            </div>
            <div className="border-t border-b border-dashed border-black py-2 mb-2">
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>{formatRupiah(activeThermalRecord.total_nominal)}</span>
              </div>
              <div className="flex justify-between text-[8pt]">
                <span>Status:</span>
                <span className="uppercase">{activeThermalRecord.status_bayar || 'LUNAS'}</span>
              </div>
            </div>
            <div className="text-center text-[8pt]">
              Terima kasih atas kunjungan Anda<br/>Layanan Kesehatan Prima
            </div>
          </div>

        ) : (
           
          <div className="font-serif">
            <div className="flex items-center justify-between border-b-[3px] border-double border-black pb-4 mb-4" style={{ pageBreakInside: 'avoid' }}>
              <img src="/logo-pemkab.png" alt="Logo Pemkab" className="w-17.5 object-contain" />
              <div className="text-center flex-1">
                <h3 className="text-[11pt] font-bold tracking-wide">PEMERINTAH KABUPATEN KERINCI</h3>
                <h2 className="text-[12pt] font-bold tracking-wide">DINAS KESEHATAN</h2>
                <h1 className="text-[16pt] font-black uppercase tracking-wider">RSUD BUKIT KERMAN</h1>
                <p className="text-[9pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
              </div>
              <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-17.5 object-contain" />
            </div>

            <div className="text-center pt-2 mb-4" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-[12pt] font-bold underline uppercase">
                {printMode === 'BATCH' ? 'LAPORAN REKAPITULASI KEUANGAN TERPILIH (BATCH)' : 'LAPORAN REKAPITULASI KEUANGAN LINTAS UNIT'}
              </h2>
            </div>

            <div className="flex justify-between text-[10pt] mb-4" style={{ pageBreakInside: 'avoid' }}>
              <div>
                <p><strong>Periode:</strong> {startDate || 'Semua'} s/d {endDate || 'Semua'}</p>
                <p><strong>Status Audit SPI:</strong> {spiAuditStatus ? 'Telah Diaudit & Valid' : 'Belum Diperiksa'}</p>
              </div>
              <div className="text-right">
                <p><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                <p><strong>Total Berkas:</strong> {dataToPrint.length} Data</p>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="w-16">ID</th>
                  <th className="w-24">Tanggal</th>
                  <th className="w-24">Unit</th>
                  <th>Pasien / RM</th>
                  <th className="w-32">Penjamin</th>
                  <th className="w-32 text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {dataToPrint.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4">Tidak ada data untuk dicetak.</td></tr>
                ) : (
                  dataToPrint.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center font-mono">{item.id}</td>
                      <td className="text-center">{item.tanggal_record ? new Date(item.tanggal_record).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="text-center uppercase">{item.sumber_modul}</td>
                      <td>
                        <strong>{item.nama_pasien}</strong><br/>
                        <span className="text-[8pt]">RM: {item.no_rm || '-'}</span>
                      </td>
                      <td className="text-center">{item.penjaminan || item.penjamin || 'UMUM'}</td>
                      <td className="text-right font-mono font-bold">{formatRupiah(item.total_nominal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={5} className="text-right uppercase">TOTAL PENDAPATAN :</td>
                  <td className="text-right font-mono">{formatRupiah(totalNominalPrint)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-end mt-12" style={{ pageBreakInside: 'avoid' }}>
              <div className="flex items-center gap-2">
                <QrCode className="w-16 h-16" />
                <div className="text-[8pt] font-mono">
                  <strong>DIREKAM SECARA DIGITAL</strong><br />
                  Sistem Informasi RSUD Bukit Kerman<br />
                  Validasi SPI ID: {Date.now()}
                </div>
              </div>
              <div className="text-center text-[10pt]">
                <p>Kerinci, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold mb-16">Direktur / Penanggung Jawab RSUD<br/>Kabupaten Kerinci</p>
                <p className="font-bold underline">{signerName}</p>
                <p className="font-mono text-[9pt]">{signerNip}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}