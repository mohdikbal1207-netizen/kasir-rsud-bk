-- 1. TABEL MASTER HEADER RINCIAN BIAYA OBAT & OBHP
CREATE TABLE IF NOT EXISTS public.rincian_obat_header (
    id BIGSERIAL PRIMARY KEY,
    no_transaksi VARCHAR(50) UNIQUE NOT NULL, -- Format: ROB-202609-001
    no_rm VARCHAR(30) NOT NULL,
    nama_pasien VARCHAR(150) NOT NULL,
    jenis_layanan VARCHAR(30) DEFAULT 'Rawat Jalan', -- Rawat Jalan / Rawat Inap / IGD
    penanggung_jawab_apotek VARCHAR(100) DEFAULT 'Apoteker RSUD Bukit Kerman',
    total_biaya NUMERIC(15, 2) DEFAULT 0,
    status_verifikasi VARCHAR(30) DEFAULT 'Menunggu Verifikasi', -- Menunggu Verifikasi / Disetujui / Ditolak
    is_locked BOOLEAN DEFAULT FALSE, -- Mencegah Kasir Mengedit setelah Dikirim
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL DETAIL ITEM OBAT DAN OBHP
CREATE TABLE IF NOT EXISTS public.rincian_obat_detail (
    id BIGSERIAL PRIMARY KEY,
    header_id BIGINT REFERENCES public.rincian_obat_header(id) ON DELETE CASCADE,
    nama_obat_obhp VARCHAR(255) NOT NULL,
    jumlah INT NOT NULL DEFAULT 1,
    harga_satuan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime Sync Enable
ALTER PUBLICATION supabase_realtime ADD TABLE rincian_obat_header;
ALTER PUBLICATION supabase_realtime ADD TABLE rincian_obat_detail;