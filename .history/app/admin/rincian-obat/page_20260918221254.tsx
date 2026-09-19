'use client';

import React, { useState } from 'react';
import { Pill, Search, Download, ArrowLeft, Filter } from 'lucide-react';
import Link from 'next/link';

export default function AdminRincianObatPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const sampleDataAdmin = [
    { id: 'IGD-001', noRm: 'RM-9901', pasien: 'Sdr. Ahmad', totalObat: 20000, totalObhp: 65000, totalBiaya: 85000, tanggal: '2026-03-18' },
    { id: 'IGD-002', noRm: 'RM-9902', pasien: 'Ny. Siti', totalObat: 120000, totalObhp: 45000, totalBiaya: 165000, tanggal: '2026-03-18' },
    { id: 'IGD-003', noRm: 'RM-9903', pasien: 'Tn. Budi', totalObat: 45000, totalObhp: 30000, totalBiaya: 75000, tanggal: '2026-03-18' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-600" /> Control & Rekapitulasi Obat/OBHP
              </h1>
              <p className="text-xs text-slate-500">Audit seluruh akumulasi tagihan farmasi dan bahan habis pakai pasien</p>
            </div>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow">
            <Download className="w-4 h-4" /> Ekspor Rekap CSV
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi, RM, pasien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Total 3 Berkas Rincian
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                  <th className="p-3">ID / Tgl</th>
                  <th className="p-3">No. RM & Pasien</th>
                  <th className="p-3 text-right">Biaya Obat</th>
                  <th className="p-3 text-right">Biaya OBHP</th>
                  <th className="p-3 text-right">Total Akumulasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sampleDataAdmin.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.id}<br/><span className="text-[10px] text-slate-400">{item.tanggal}</span></td>
                    <td className="p-3"><strong className="block text-slate-900">{item.pasien}</strong><span className="font-mono text-amber-700 text-[11px]">{item.noRm}</span></td>
                    <td className="p-3 text-right font-mono text-slate-700">Rp {item.totalObat.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono text-slate-700">Rp {item.totalObhp.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono font-black text-indigo-900">Rp {item.totalBiaya.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}