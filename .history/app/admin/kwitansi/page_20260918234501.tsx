'use client';

import React, { useState } from 'react';
import { Receipt, Search, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminKwitansiAuditPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const kwitansiData = [
    { noKwitansi: 'KW/2026/03/0089', idTx: 'IGD-001', pasien: 'Sdr. Ahmad', total: 350000, kasir: 'Kasir Shift 1', status: 'Verifikasi' },
    { noKwitansi: 'KW/2026/03/0090', idTx: 'IGD-002', pasien: 'Ny. Siti', total: 540000, kasir: 'Kasir Shift 1', status: 'Verifikasi' },
    { noKwitansi: 'KW/2026/03/0091', idTx: 'IGD-003', pasien: 'Tn. Budi', total: 210000, kasir: 'Kasir Shift 2', status: 'Pending' },
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
                <Receipt className="w-5 h-5 text-indigo-600" /> Audit & Master Kwitansi Pembayaran
              </h1>
              <p className="text-xs text-slate-500">Pusat rekapitulasi penomoran kwitansi resmi dari kasir</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no kwitansi, pasien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                  <th className="p-3">No Kwitansi</th>
                  <th className="p-3">ID Transaksi</th>
                  <th className="p-3">Pasien</th>
                  <th className="p-3">Petugas Kasir</th>
                  <th className="p-3 text-right">Total Biaya</th>
                  <th className="p-3 text-center">Aksi / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {kwitansiData.map((item) => (
                  <tr key={item.noKwitansi} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-amber-700">{item.noKwitansi}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{item.idTx}</td>
                    <td className="p-3 font-bold text-slate-800">{item.pasien}</td>
                    <td className="p-3 text-slate-600">{item.kasir}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">Rp {item.total.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => window.print()}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center gap-1 mx-auto font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" /> Salinan
                      </button>
                    </td>
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