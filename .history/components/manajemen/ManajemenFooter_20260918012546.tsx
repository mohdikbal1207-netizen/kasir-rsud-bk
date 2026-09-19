export default function ManajemenFooter() {
  return (
    <footer className="w-full bg-white/70 border-t border-slate-200/80 backdrop-blur-md py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p className="font-medium">
          &copy; {new Date().getFullYear()} <strong className="text-slate-700">RSUD Bukit Kerman</strong> — Kabupaten Kerinci. Hak Cipta Dilindungi.
        </p>
        <div className="flex items-center space-x-4">
          <span className="hover:text-emerald-600 transition cursor-pointer">Sistem Informasi Manajemen RS (SIMRS)</span>
          <span>&bull;</span>
          <span className="hover:text-emerald-600 transition cursor-pointer">Kebijakan Privasi</span>
        </div>
      </div>
    </footer>
  );
}