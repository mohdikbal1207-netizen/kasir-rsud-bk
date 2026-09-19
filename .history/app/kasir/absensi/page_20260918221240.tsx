'use client';

import React, { useState } from 'react';
import { Clock, LogIn, LogOut, Wallet, CheckCircle2, ArrowLeft, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function AbsensiKasirMandiriPage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [shift, setShift] = useState('Shift 1 (Pagi)');
  const [kasAwal, setKasAwal] = useState(500000);
  const [catatan, setCatatan] = useState('');

  const handleClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckedIn(true);
  };

  const handleClockOut = () => {
    setIsCheckedIn(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/kasir/igd" className="p-2 hover:bg-slate-100 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" /> Presensi & Shift Petugas Kasir
              </h1>
              <p className="text-xs text-slate-500">Form mandiri masuk shift dan pencatatan kas awal/akhir</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Status Shift Saat Ini</p>
                <p className="text-sm font-black text-slate-900">{isCheckedIn ? 'AKTIF (ON SHIFT)' : 'BELUM MASUK SHIFT'}</p>
              </div>
            </div>
            {isCheckedIn && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi System
              </span>
            )}
          </div>

          {!isCheckedIn ? (
            <form onSubmit={handleClockIn} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Shift Kerja</label>
                <select 
                  value={shift} 
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none font-medium"
                >
                  <option value="Shift 1 (Pagi)">Shift 1 (Pagi) — 07:00 s/d 14:00</option>
                  <option value="Shift 2 (Siang)">Shift 2 (Siang) — 14:00 s/d 21:00</option>
                  <option value="Shift 3 (Malam)">Shift 3 (Malam) — 21:00 s/d 07:00</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Modal Kas Awal Dalam Laci (IDR)</label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={kasAwal}
                    onChange={(e) => setKasAwal(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-3 font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Penyerahan Modal (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kondisi kas awal / serah terima shift..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Masuk Shift & Simpan Kas Awal
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-xs border-t border-slate-100 pt-4">
              <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <p className="font-bold text-emerald-900">Shift Aktif: {shift}</p>
                <p className="text-slate-600">Jam Masuk: <strong className="font-mono text-slate-800">07:02 WIB</strong></p>
                <p className="text-slate-600">Modal Kas Awal: <strong className="font-mono text-slate-800">Rp {kasAwal.toLocaleString('id-ID')}</strong></p>
              </div>

              <button
                onClick={handleClockOut}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Selesai Shift / Closing Kasir (Clock Out)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}