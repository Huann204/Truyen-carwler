export default function StoryDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-56 mb-4" />

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-40 sm:w-48 mx-auto sm:mx-0 shrink-0 aspect-[5/7] rounded-2xl bg-slate-200" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-24 bg-slate-200 rounded-full" />
              <div className="h-5 w-28 bg-slate-200 rounded-full" />
            </div>
            <div className="h-7 bg-slate-200 rounded w-3/4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-10 w-36 bg-slate-200 rounded-full" />
              <div className="h-10 w-44 bg-slate-100 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="h-6 bg-slate-200 rounded w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
