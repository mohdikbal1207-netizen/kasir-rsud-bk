import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Menerapkan aturan header keamanan ke seluruh halaman aplikasi
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Mencegah Clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Mencegah MIME-type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Proteksi XSS bawaan browser
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Kontrol informasi URL pengarah
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Membatasi akses perangkat keras
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // DIPERBAIKI: Menambahkan izin domain Supabase untuk gambar & storage
              "img-src 'self' blob: data: https://*.supabase.co",
              // Izinkan koneksi resmi ke Supabase & Fonnte WhatsApp Gateway
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.fonnte.com",
              "font-src 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;