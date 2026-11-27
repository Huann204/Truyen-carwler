export default function HomeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-48 sm:h-56 rounded-3xl bg-slate-200 mb-6" />

      <div className="h-12 rounded-2xl bg-slate-200/80 mb-6" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
          >
            <div className="aspect-[5/7] bg-slate-200" />
            <div className="p-2.5 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-4/5" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
