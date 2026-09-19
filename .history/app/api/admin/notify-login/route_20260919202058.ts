import { NextResponse } from 'next/server';
import { sendSecurityAlert } from '@/lib/fonnte';

export async function POST(request: Request) {
  try {
    const { adminEmail, userAgent } = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    await sendSecurityAlert(
      `🛡 *SECURITY NOTIFICATION: LOGIN ADMIN*\n\n` +
      `👤 Akun: *${adminEmail}*\n` +
      `💻 Perangkat/User-Agent: ${userAgent}\n` +
      `🌐 IP: ${clientIp}\n` +
      `⏱ Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
      `Akses panel admin berhasil dibuka.`
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}