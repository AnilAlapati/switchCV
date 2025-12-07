
import React from 'react';

export default function WarmSandPage() {
    return (
        <div className="min-h-screen bg-[#FFFBF0] text-[#1a1a1a] font-sans selection:bg-[#F2994A] selection:text-white overflow-hidden relative">

            {/* Background Orbs to break the 'document' feel */}
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#F2C94C]/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#F2994A]/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Navigation */}
            <nav className="w-full py-8 px-8 md:px-12 flex justify-between items-center relative z-10">
                <div className="text-xl font-black tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-[#F2994A] to-[#F2C94C] rounded-lg"></div>
                    SOLAR.
                </div>
                <div className="hidden md:flex gap-8 font-medium text-[#5c5c5c]">
                    <a href="#" className="hover:text-black transition-colors">Manifesto</a>
                    <a href="#" className="hover:text-black transition-colors">Gallery</a>
                    <a href="#" className="hover:text-black transition-colors">Pricing</a>
                </div>
                <button className="px-6 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-[#333] transition-colors shadow-lg shadow-orange-500/20">
                    Sign In
                </button>
            </nav>

            <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 relative z-10">

                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Left Content */}
                    <div className="space-y-8">
                        <span className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold uppercase tracking-widest mb-4">
                            v2.0 Now Available
                        </span>

                        <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight">
                            Warmth in <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2994A] to-[#F2C94C]">Digital Spaces.</span>
                        </h1>

                        <p className="text-xl text-[#666] leading-relaxed max-w-lg">
                            Software doesn't have to feel cold. We build interfaces that radiate energy, creativity, and human connection.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <button className="px-8 py-4 bg-[#F2994A] text-white font-bold rounded-xl text-lg hover:bg-[#e08e43] transition-transform hover:-translate-y-1 shadow-xl shadow-orange-500/30">
                                Get Started
                            </button>
                            <button className="px-8 py-4 bg-white text-black border-2 border-orange-100 font-bold rounded-xl text-lg hover:border-orange-200 transition-colors">
                                View Demo
                            </button>
                        </div>

                        <div className="flex items-center gap-4 pt-8 text-sm font-medium text-gray-400">
                            <span>TRUSTED BY</span>
                            <div className="h-px bg-gray-200 w-12"></div>
                            <div className="flex gap-4 grayscale opacity-50">
                                <span>STRIPE</span>
                                <span>LINEAR</span>
                                <span>NOTION</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Visual */}
                    <div className="relative">
                        {/* Main Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(242,153,74,0.3)] border border-orange-50 relative z-20 transform rotate-[-2deg] transition-transform hover:rotate-0 duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="text-xs font-bold text-gray-300 uppercase">Dashboard</div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-4 items-center p-4 bg-orange-50/50 rounded-2xl">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">☀️</div>
                                    <div>
                                        <div className="font-bold text-gray-900">Morning Sync</div>
                                        <div className="text-sm text-gray-500">10:00 AM • Product Team</div>
                                    </div>
                                </div>

                                <div className="h-40 bg-gradient-to-br from-[#F2994A] to-[#F2C94C] rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg">
                                    <div className="text-4xl font-bold">84%</div>
                                    <div className="flex justify-between items-end">
                                        <span className="font-medium opacity-90">Weekly Goal</span>
                                        <div className="h-1 bg-white/30 w-24 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-[84%]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute top-10 -right-10 w-40 h-40 bg-[#FFFBF0] rounded-2xl shadow-lg border border-orange-100 z-10 flex items-center justify-center transform rotate-6 animate-float">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#F2994A]">5k+</div>
                                <div className="text-xs text-gray-500 font-bold uppercase">Users</div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
