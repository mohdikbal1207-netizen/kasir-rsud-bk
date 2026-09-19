-- 1. Tabel Utama Data Pasien & Header Transaksi Rawat Inap
CREATE TABLE IF NOT EXISTS public.ranap_billing_header (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_reg VARCHAR(50) UNIQUE NOT NULL,
    nama_pasien VARCHAR(150) NOT NULL,
    umur VARCHAR(20),
    alamat TEXT,
    diagnosa TEXT,
    ruang VARCHAR(100),
    masuk_tgl TIMESTAMP WITH TIME ZONE,
    keluar_tgl TIMESTAMP WITH TIME ZONE,
    dokter_merawat VARCHAR(150),
    kepala_ruangan VARCHAR(150),
    bendahara_penerima VARCHAR(150),
    status_verifikasi VARCHAR(30) DEFAULT 'PENDING' CHECK (status_verifikasi IN ('PENDING', 'VERIFIED_ADMIN', 'PAID', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Rincian Biaya Per Item (Mengikuti Format Form Ranap RSUD Bukit Kerman)
CREATE TABLE IF NOT EXISTS public.ranap_billing_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_reg VARCHAR(50) REFERENCES public.ranap_billing_header(no_reg) ON DELETE CASCADE,
    kategori_biaya VARCHAR(50) NOT NULL, -- 'RUANGAN', 'MAKAN', 'VISIT', 'OBAT', 'OPERASI', 'PENUNJANG', 'LAINNYA'
    nama_item VARCHAR(150) NOT NULL,     -- Contoh: 'Super VIP', 'Injeksi', 'Laboratorium a', dll.
    volume NUMERIC(10, 2) DEFAULT 0,
    tarif_satuan NUMERIC(15, 2) DEFAULT 0,
    jumlah_total NUMERIC(15, 2) DEFAULT 0,
    ditanggung_pihak3 NUMERIC(15, 2) DEFAULT 0, -- Ditanggung Pihak ke III (BPJS/Asuransi)
    selisih_bayar NUMERIC(15, 2) DEFAULT 0,    -- Selisih (Luar Biaya / Pasien Umum)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indeks untuk Performa Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_ranap_noreg ON public.ranap_billing_header(no_reg);
CREATE INDEX IF NOT EXISTS idx_ranap_items_noreg ON public.ranap_billing_items(no_reg);

-- Enable Row Level Security (RLS) Opsional sesuai kebijakan Supabase
ALTER TABLE public.ranap_billing_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranap_billing_items ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Staf Internal
CREATE POLICY "Akses penuh staf internal ranap header" ON public.ranap_billing_header FOR ALL USING (true);
CREATE POLICY "Akses penuh staf internal ranap items" ON public.ranap_billing_items FOR ALL USING (true);