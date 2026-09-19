import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { target, message } = await request.json();

    if (!target || !message) {
      return NextResponse.json(
        { success: false, message: 'Nomor tujuan dan pesan wajib diisi.' },
        { status: 400 }
      );
    }

    const fonnteToken = process.env.FONNTE_TOKEN || 'fLB7F8qZMnyrj75qVqZk';

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: '62',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal mengirim pesan melalui Fonnte Gateway.');
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan pada server WhatsApp.';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}