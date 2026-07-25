/** Placeholder rows for list-style screens while server data loads. */
export function ListRowSkeleton({
  rows = 4,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`card overflow-hidden ${className}`.trim()}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center justify-between px-4 py-3.5 ${
            index !== rows - 1 ? "border-b border-brand-line/70" : ""
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-lg bg-slate-200/80 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-2/3 max-w-[10rem] rounded bg-slate-200/80 animate-pulse" />
              <div className="mt-2 h-3 w-1/3 max-w-[6rem] rounded bg-slate-200/70 animate-pulse" />
            </div>
          </div>
          <div className="h-3.5 w-16 rounded bg-slate-200/80 animate-pulse shrink-0 ml-2" />
        </div>
      ))}
    </div>
  );
}

export function PlanGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 pb-28 pt-1">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="card px-3.5 pt-4 pb-3.5 min-h-[5.5rem]"
        >
          <div className="h-5 w-16 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-2 h-3 w-20 rounded bg-slate-200/70 animate-pulse" />
          <div className="mt-3 h-4 w-14 rounded bg-slate-200/80 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
