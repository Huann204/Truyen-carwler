export default function ChapterReaderLoading() {
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-5 animate-pulse">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-4">
        <div className="h-4 bg-slate-200 rounded w-48" />
        <div className="h-7 bg-slate-200 rounded w-2/3 mx-auto" />
        <div className="flex justify-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-full" />
          <div className="h-9 w-44 bg-slate-100 rounded-full" />
          <div className="h-9 w-28 bg-slate-200 rounded-full" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 space-y-4">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-11/12" />
        <div className="h-4 bg-slate-100 rounded w-10/12" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-9/12" />
        <div className="h-64 bg-slate-100 rounded-xl mt-4" />
      </div>
    </div>
  );
}
