export default function AdminFooter() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-4 text-center text-xs space-y-2 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-medium">
          &copy; {new Date().getFullYear()} <strong className="text-slate-200">RSUD Bukit Kerman</strong>. Sistem Informasi Manajemen Rumah Sakit (SIMRS).
        </p>
        <p className="text-[11px] text-slate-500">
          Designed &amp; Developed by <span className="text-emerald-400 font-bold">Mohd. Ikbal, S.Tr.Kes</span>
        </p>
      </div>
    </footer>
  );
}