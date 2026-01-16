
import React from 'react';

export default function GlassNaturePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#E8F3EE] via-[#D8EBE2] to-[#CDE4DC] text-[#2C4A3B] font-sans selection:bg-[#2C4A3B] selection:text-white relative overflow-hidden">

            {/* Background blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#4ADE80] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2DD4BF] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

            {/* Nav */}
            <nav className="sticky top-0 z-50 px-6 py-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl px-6 py-4 flex justify-between items-center shadow-lg shadow-[#2C4A3B]/5">
                        <div className="font-semibold text-xl tracking-tight text-[#1A2F25]">Aura.</div>
                        <div className="hidden md:flex gap-8 text-sm font-medium text-[#2C4A3B]/80">
                            <a href="#" className="hover:text-[#1A2F25] transition-colors">Experience</a>
                            <a href="#" className="hover:text-[#1A2F25] transition-colors">Spaces</a>
                            <a href="#" className="hover:text-[#1A2F25] transition-colors">Pricing</a>
                        </div>
                        <button className="bg-[#2C4A3B] text-white/90 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1A2F25] transition-all shadow-lg shadow-[#2C4A3B]/20">
                            Connect
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <main className="max-w-6xl mx-auto px-6 pt-16 pb-32 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    <div>
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-[#1A2F25] mb-8 leading-[1.1]">
                            Clarity through <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2C4A3B] to-[#15803d]">transparency.</span>
                        </h1>
                        <p className="text-lg text-[#2C4A3B]/70 mb-10 leading-relaxed max-w-lg">
                            Experience a UI that feels lighter than air.
                            Inspired by frosted glass and botanical greens,
                            designed for peace of mind.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button className="bg-[#2C4A3B] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#1A2F25] transition-all shadow-xl shadow-[#2C4A3B]/20 hover:scale-[1.02]">
                                Start Exploring
                            </button>
                            <button className="bg-white/30 backdrop-blur-md text-[#1A2F25] border border-white/40 px-8 py-4 rounded-2xl font-medium hover:bg-white/40 transition-all shadow-sm">
                                Watch Video
                            </button>
                        </div>
                    </div>

                    {/* Glass Card Demo */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-green-400 rounded-[3rem] blur-2xl opacity-20 transform rotate-6"></div>
                        <div className="bg-white/30 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-2xl shadow-[#2C4A3B]/10 relative">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <div className="text-sm font-medium text-[#2C4A3B]/60 uppercase tracking-wider">Current Status</div>
                                    <div className="text-3xl font-bold text-[#1A2F25]">Active</div>
                                </div>
                                <div className="w-12 h-12 bg-[#2C4A3B]/10 rounded-full flex items-center justify-center text-[#2C4A3B]">
                                    ✨
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white/40 border border-white/40 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/60 transition-colors cursor-pointer">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D8EBE2] to-[#CDE4DC]"></div>
                                        <div className="flex-1">
                                            <div className="h-2 w-24 bg-[#2C4A3B]/10 rounded-full mb-2"></div>
                                            <div className="h-2 w-16 bg-[#2C4A3B]/5 rounded-full"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
