export default function Loading() {
  return (
    <div className="app-shell pb-28 pointer-events-none">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="h-3 w-16 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-2 h-6 w-28 rounded bg-slate-200/90 animate-pulse" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-white/80 border border-brand-line/60 shadow-soft animate-pulse" />
          <div className="h-10 w-10 rounded-xl bg-white/80 border border-brand-line/60 shadow-soft animate-pulse" />
        </div>
      </div>

      <div className="mx-5 mt-2 rounded-2xl p-5 text-white relative overflow-hidden shadow-glow bg-wallet-card animate-pulse">
        <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
        <div className="relative">
          <div className="h-3 w-24 rounded bg-white/20" />
          <div className="mt-4 h-10 w-44 rounded bg-white/20" />
          <div className="mt-5 flex gap-2.5">
            <div className="h-11 flex-1 rounded-xl bg-white/20" />
            <div className="h-11 flex-1 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-7">
        <div className="h-3 w-20 rounded bg-slate-200/80 animate-pulse mb-3" />
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-brand-line/60 shadow-soft animate-pulse" />
              <div className="h-3 w-12 rounded bg-slate-200/80 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 rounded bg-slate-200/80 animate-pulse" />
          <div className="h-3 w-14 rounded bg-slate-200/80 animate-pulse" />
        </div>
        <div className="card overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`flex items-center justify-between px-4 py-3.5 ${
                index !== 4 ? "border-b border-brand-line/70" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-lg bg-slate-200/80 animate-pulse shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-2/3 rounded bg-slate-200/80 animate-pulse" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-slate-200/70 animate-pulse" />
                </div>
              </div>
              <div className="h-3.5 w-16 rounded bg-slate-200/80 animate-pulse shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
