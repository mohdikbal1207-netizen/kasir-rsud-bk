// lib/fonnte.ts

export async function sendSecurityAlert(message: string) {
  const fonnteToken = process.env.FONNTE_API_TOKEN;
  // Nomor WhatsApp pribadi Anda sebagai IT Coordinator (bisa diatur via env atau default)
  const targetPhone = process.env.ADMIN_WHATSAPP_NUMBER || '6282281155614';

  if (!fonnteToken) {
    console.warn('Fonnte API Token belum dikonfigurasi di environment variables (.env.local)');
    return;
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: targetPhone,
        message: message,
        countryCode: '62',
      }),
    });

    const result = await response.json();
    if (!result.status) {
      console.error('Gagal mengirim WhatsApp via Fonnte:', result.reason || result);
    }
    return result;
  } catch (err) {
    console.error('Fonnte Gateway Error:', err);
  }
}