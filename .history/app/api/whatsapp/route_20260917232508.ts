import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Amankan parsing JSON body
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Format data permintaan (JSON) tidak valid.' },
        { status: 400 }
      );
    }

    // Ambil data spesifik pendaftaran dari client (bukan langsung target & message mentah)
    const { nama_lengkap, unit_kerja, nip, email, no_telepon } = body;

    // Validasi field minimal yang diperlukan untuk notifikasi admin
    if (!nama_lengkap || !unit_kerja || !no_telepon) {
      return NextResponse.json(
        { success: false, message: 'Data informasi pendaftaran tidak lengkap.' },
        { status: 400 }
      );
    }

    // Ambil token dari environment variables
    const fonnteToken = process.env.FONNTE_TOKEN;
    if (!fonnteToken) {
      console.error('FATAL: FONNTE_TOKEN belum dikonfigurasi di environment variables.');
      return NextResponse.json(
        { success: false, message: 'Konfigurasi server WhatsApp belum lengkap.' },
        { status: 500 }
      );
    }

    // Tentukan nomor tujuan admin secara server-side (Bisa via ENV atau hardcode aman di server)
    // Menggunakan nomor IT Coordinator: Mohd. Ikbal (6282281155614)
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '6282281155614';

    // Sanitasi nomor telepon pendaftar ke format internasional
    const cleanedPhone = String(no_telepon).replace(/\D/g, '');
    const formattedPhone = cleanedPhone.startsWith('0') ? '62' + cleanedPhone.slice(1) : cleanedPhone;

    // Rangkai pesan secara aman di dalam server (Client tidak bisa memanipulasi isi pesan bebas)
    const serverGeneratedMessage = 
      `🚨 *PENGAJUAN AKUN STAF BARU SIMRS*\n\n` +
      `Halo Admin IT / Manajemen RSUD Bukit Kerman,\n` +
      `Ada pendaftaran akun staf baru yang menunggu verifikasi:\n\n` +
      `👤 *Nama:* ${nama_lengkap}\n` +
      `🏥 *Unit Kerja:* ${unit_kerja}\n` +
      `🆔 *NIP/ID:* ${nip || '-'}\n` +
      `📧 *Email:* ${email || '-'}\n` +
      `📱 *No HP:* ${formattedPhone}\n\n` +
      `Silakan login ke Portal Admin SIMRS untuk mengaktifkan akun ini.`;

    // Buat timeout 10 detik menggunakan AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: adminPhone,
        message: serverGeneratedMessage,
        countryCode: '62',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Fonnte terkadang mengembalikan HTTP 200 meskipun gagal mengirim pesan
    if (!response.ok || data.status === false || data.success === false) {
      const errorReason = data.reason || data.message || 'Gagal mengirim pesan melalui Fonnte Gateway.';
      throw new Error(errorReason);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, message: 'Koneksi ke Fonnte Gateway melebihi batas waktu (Timeout).' },
        { status: 504 }
      );
    }

    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan pada server WhatsApp.';
    console.error('WhatsApp API Error:', errorMessage);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}