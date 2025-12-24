"use client";

interface TopReferrersProps {
  referrers: Record<string, number>;
}

export function TopReferrers({ referrers }: TopReferrersProps) {
  const referrerEntries = Object.entries(referrers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 flex items-center">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-purple-500"></span>
          Referral Channels
        </h3>
        <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
          Discovery Sources
        </span>
      </div>

      <div className="space-y-4">
        {referrerEntries.length > 0 ? (
          referrerEntries.map(([referrer, count]) => (
            <div
              key={referrer}
              className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-slate-100/50 transition-all hover:border-purple-200"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 text-sm">
                  🔗
                </div>
                <span className="text-sm font-bold text-[#1A2F25] truncate max-w-[150px]">
                  {referrer || "Direct Link"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-[#1A2F25]">
                  {count}
                </span>
                <p className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">Hits</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-2xl mb-2">🎈</p>
            <p className="text-xs font-bold text-[#1A2F25]/40 uppercase tracking-widest">No referral data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
