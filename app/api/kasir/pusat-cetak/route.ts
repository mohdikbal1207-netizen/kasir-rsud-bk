import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const jenisLayanan = searchParams.get('jenis_layanan') || 'RAJAL';

    // Menerima limit dinamis dari query URL, default dinaikkan ke 5000 data
    const limit = Number(searchParams.get('limit')) || 5000;

    let data: any[] = [];
    let error: any = null;

    if (jenisLayanan === 'RAJAL' || jenisLayanan === 'rawat_jalan') {
      let query = supabase.from('transaksi_pasien').select('*');
      if (startDate && endDate) {
        query = query.gte('tanggal_transaksi', `${startDate}T00:00:00.000Z`).lte('tanggal_transaksi', `${endDate}T23:59:59.999Z`);
      }
      // Mengubah .limit(100) menjadi .limit(limit)
      const res = await query.order('tanggal_transaksi', { ascending: false }).limit(limit);
      data = res.data || [];
      error = res.error;
    } 
    else if (jenisLayanan === 'IGD' || jenisLayanan === 'igd') {
      let query = supabase.from('pemeriksaan_igd_header').select('*');
      if (startDate && endDate) {
        query = query.gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      // Mengubah .limit(100) menjadi .limit(limit)
      const res = await query.order('created_at', { ascending: false }).limit(limit);
      data = res.data || [];
      error = res.error;
    } 
    else if (jenisLayanan === 'RANAP' || jenisLayanan === 'ranap') {
      let query = supabase.from('vw_detail_pasien_ranap').select('*');
      if (startDate && endDate) {
        query = query.gte('masuk_tgl', `${startDate}T00:00:00.000Z`).lte('masuk_tgl', `${endDate}T23:59:59.999Z`);
      }
      // Mengubah .limit(100) menjadi .limit(limit)
      const res = await query.order('masuk_tgl', { ascending: false }).limit(limit);
      data = res.data || [];
      error = res.error;
    } 
    else if (jenisLayanan === 'OBAT' || jenisLayanan === 'obat') {
      let query = supabase.from('rincian_obat_header').select('*');
      if (startDate && endDate) {
        query = query.gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      // Mengubah .limit(100) menjadi .limit(limit)
      const res = await query.order('created_at', { ascending: false }).limit(limit);
      data = res.data || [];
      error = res.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server kasir' }, { status: 500 });
  }
}