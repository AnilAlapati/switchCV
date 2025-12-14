"use client";

export function SubscriptionSection() {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] mt-8">
            <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] flex items-center justify-center shadow-lg shadow-[#2C4A3B]/20 text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A2F25]">Subscription</h2>
                        <p className="text-[#1A2F25]/50 text-sm font-medium">
                            Manage your billing and plan details
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-[#F5F7F6] rounded-xl border border-[#1A2F25]/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[#1A2F25] text-lg">Free Plan</h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">Active</span>
                        </div>
                        <p className="text-sm text-[#1A2F25]/60">Basic features for job seekers</p>
                    </div>
                    <button
                        className="px-5 py-2.5 bg-[#1A2F25] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1A2F25]/20 hover:bg-[#2C4A3B] hover:scale-[1.02] transition-all"
                    >
                        Upgrade Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
