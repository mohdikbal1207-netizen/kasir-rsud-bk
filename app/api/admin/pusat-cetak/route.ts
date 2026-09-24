import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const jenisLayanan = searchParams.get('jenis_layanan') || 'semua';

    let combinedData: any[] = [];

    // 1. Rawat Jalan (transaksi_pasien)
    if (jenisLayanan === 'semua' || jenisLayanan === 'rawat_jalan') {
      let queryRajal = supabase.from('transaksi_pasien').select('*');
      if (startDate && endDate) {
        queryRajal = queryRajal.gte('tanggal_transaksi', `${startDate}T00:00:00.000Z`).lte('tanggal_transaksi', `${endDate}T23:59:59.999Z`);
      }
      const { data: rajalData } = await queryRajal.order('tanggal_transaksi', { ascending: false });
      if (rajalData) {
        combinedData.push(...rajalData.map(d => ({
          ...d,
          sumber_modul: 'RAWAT JALAN',
          tanggal_record: d.tanggal_transaksi || d.created_at,
          total_nominal: d.total_biaya || 0
        })));
      }
    }

    // 2. IGD (pemeriksaan_igd_header)
    if (jenisLayanan === 'semua' || jenisLayanan === 'igd') {
      let queryIgd = supabase.from('pemeriksaan_igd_header').select('*');
      if (startDate && endDate) {
        queryIgd = queryIgd.gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      const { data: igdData } = await queryIgd.order('created_at', { ascending: false });
      if (igdData) {
        combinedData.push(...igdData.map(d => ({
          ...d,
          sumber_modul: 'IGD',
          tanggal_record: d.created_at,
          total_nominal: d.total_biaya || d.total_keseluruhan || 0
        })));
      }
    }

    // 3. Rawat Inap (vw_detail_pasien_ranap)
    if (jenisLayanan === 'semua' || jenisLayanan === 'ranap') {
      let queryRanap = supabase.from('vw_detail_pasien_ranap').select('*');
      if (startDate && endDate) {
        queryRanap = queryRanap.gte('masuk_tgl', `${startDate}T00:00:00.000Z`).lte('masuk_tgl', `${endDate}T23:59:59.999Z`);
      }
      const { data: ranapData } = await queryRanap.order('masuk_tgl', { ascending: false });
      if (ranapData) {
        combinedData.push(...ranapData.map(d => ({
          ...d,
          sumber_modul: 'RAWAT INAP',
          tanggal_record: d.masuk_tgl,
          total_nominal: d.total_biaya_ranap || 0
        })));
      }
    }

    // 4. Apotek / Resep Obat (rincian_obat_header)
    if (jenisLayanan === 'semua' || jenisLayanan === 'obat') {
      let queryObat = supabase.from('rincian_obat_header').select('*');
      if (startDate && endDate) {
        queryObat = queryObat.gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      const { data: obatData } = await queryObat.order('created_at', { ascending: false });
      if (obatData) {
        combinedData.push(...obatData.map(d => ({
          ...d,
          sumber_modul: 'APOTEK / OBAT',
          tanggal_record: d.created_at,
          total_nominal: d.total_biaya || 0
        })));
      }
    }

    // Urutkan gabungan data berdasarkan tanggal terbaru
    combinedData.sort((a, b) => new Date(b.tanggal_record || 0).getTime() - new Date(a.tanggal_record || 0).getTime());

    const totalTransaksi = combinedData.length;
    const grandTotalPendapatan = combinedData.reduce((acc, curr) => acc + Number(curr.total_nominal || 0), 0);

    return NextResponse.json(
      { 
        success: true, 
        summary: {
          totalTransaksi,
          grandTotalPendapatan
        },
        data: combinedData 
      }, 
      { status: 200 }
    );

  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan internal pada server admin' }, { status: 500 });
  }
}