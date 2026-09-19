import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Amankan parsing JSON body jika payload kosong atau tidak valid
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Format data permintaan (JSON) tidak valid.' },
        { status: 400 }
      );
    }

    const { target, message } = body;

    if (!target || !message) {
      return NextResponse.json(
        { success: false, message: 'Nomor tujuan (target) dan pesan wajib diisi.' },
        { status: 400 }
      );
    }

    // Ambil token dari environment variables tanpa hardcode fallback demi keamanan
    const fonnteToken = process.env.FONNTE_TOKEN;
    if (!fonnteToken) {
      console.error('FATAL: FONNTE_TOKEN belum dikonfigurasi di environment variables.');
      return NextResponse.json(
        { success: false, message: 'Konfigurasi server WhatsApp belum lengkap.' },
        { status: 500 }
      );
    }

    // Sanitasi nomor target (pastikan hanya berisi angka)
    const cleanedTarget = String(target).replace(/\D/g, '');

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
        target: cleanedTarget,
        message,
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
    // Tangani error jika terjadi timeout koneksi
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