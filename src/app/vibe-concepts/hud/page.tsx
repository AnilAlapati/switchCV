
import React from 'react';

export default function HUDPage() {
    return (
        <div className="min-h-screen bg-[#0a192f] text-[#64ffda] font-mono p-6 overflow-hidden relative">

            {/* Grid Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'linear-gradient(#112240 1px, transparent 1px), linear-gradient(90deg, #112240 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* Target Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#64ffda]/20 rounded-full z-0 flex items-center justify-center">
                <div className="w-[500px] h-[500px] border border-[#64ffda]/10 rounded-full animate-spin-slow"></div>
                <div className="absolute top-0 w-1 h-4 bg-[#64ffda]"></div>
                <div className="absolute bottom-0 w-1 h-4 bg-[#64ffda]"></div>
                <div className="absolute left-0 w-4 h-1 bg-[#64ffda]"></div>
                <div className="absolute right-0 w-4 h-1 bg-[#64ffda]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">

                {/* Top Bar */}
                <div className="flex justify-between items-center border-b border-[#64ffda]/30 pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <span className="bg-[#64ffda]/10 px-2 text-xs">CANDIDATE_ID: 8X-291</span>
                        <span className="text-white font-bold text-xl">JOHN DOE</span>
                    </div>
                    <div className="flex gap-8 text-xs">
                        <span>MATCH: <span className="text-white font-bold text-lg">94%</span></span>
                        <span>STATUS: <span className="text-yellow-400">REVIEWING</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">

                    {/* L: Profile Hologram */}
                    <div className="col-span-3 border border-[#64ffda]/30 bg-[#112240]/50 p-4 relative">
                        <div className="w-full aspect-square border border-[#64ffda]/50 mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#64ffda]/20 animate-scan"></div>
                            <span className="text-4xl text-[#64ffda]/50">IMG</span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="opacity-70">EXP</span>
                                <span className="text-white">8 YEARS</span>
                            </div>
                            <div className="h-1 bg-[#233554] w-full"><div className="h-full bg-[#64ffda] w-[80%]"></div></div>

                            <div className="flex justify-between mt-2">
                                <span className="opacity-70">SKILL</span>
                                <span className="text-white">SENIOR</span>
                            </div>
                            <div className="h-1 bg-[#233554] w-full"><div className="h-full bg-[#64ffda] w-[90%]"></div></div>
                        </div>
                    </div>

                    {/* C: Main Data */}
                    <div className="col-span-6 space-y-4">
                        {/* Education Module */}
                        <div className="border border-[#64ffda]/30 bg-[#112240]/80 p-6 backdrop-blur-sm relative group hover:border-[#64ffda] transition-colors cursor-crosshair">
                            <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-[#64ffda]"></div>
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-[#64ffda]"></div>

                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#64ffda]"></span> EXPERIENCE_LOG
                            </h3>

                            <div className="space-y-4 text-sm font-light">
                                <div>
                                    <div className="flex justify-between text-[#64ffda]">
                                        <span>GOOGLE</span>
                                        <span>2020 - PRES</span>
                                    </div>
                                    <p className="text-slate-300 mt-1">
                                        Senior Engineer. Optimized search algorithms increasing CTR by 2%.
                                        <span className="bg-[#64ffda]/20 text-white px-1 ml-1 text-xs">C++</span>
                                        <span className="bg-[#64ffda]/20 text-white px-1 ml-1 text-xs">PYTHON</span>
                                    </p>
                                </div>
                                <div className="border-t border-[#64ffda]/20 pt-4">
                                    <div className="flex justify-between text-[#64ffda]">
                                        <span>AMAZON</span>
                                        <span>2018 - 2020</span>
                                    </div>
                                    <p className="text-slate-300 mt-1">
                                        SDE II. AWS Lambda team. Reduced cold start times.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-[#64ffda]/30 p-4 bg-[#112240]/50 text-center">
                                <div className="text-xs opacity-70 mb-1">GITHUB SCORE</div>
                                <div className="text-3xl font-bold text-white">A+</div>
                            </div>
                            <div className="border border-[#64ffda]/30 p-4 bg-[#112240]/50 text-center">
                                <div className="text-xs opacity-70 mb-1">LEETCODE</div>
                                <div className="text-3xl font-bold text-white">950</div>
                            </div>
                        </div>

                    </div>

                    {/* R: Keyword Heatmap */}
                    <div className="col-span-3 border border-[#64ffda]/30 bg-[#112240]/50 p-4">
                        <h3 className="text-xs font-bold mb-4 opacity-70">KEYWORD_DENSITY</h3>
                        <div className="flex flex-wrap gap-1">
                            <span className="text-lg text-white font-bold opacity-100">REACT</span>
                            <span className="text-sm text-[#64ffda] opacity-80">TYPESCRIPT</span>
                            <span className="text-xs text-[#64ffda] opacity-60">NODE</span>
                            <span className="text-xs text-[#64ffda] opacity-50">SQL</span>
                            <span className="text-md text-white font-bold opacity-90">SYSTEM_DESIGN</span>
                            <span className="text-xs text-[#64ffda] opacity-40">AWS</span>
                            <span className="text-sm text-[#64ffda] opacity-70">DOCKER</span>
                            <span className="text-xs text-[#64ffda] opacity-30">TESTING</span>
                            <span className="text-lg text-white font-bold opacity-100">PERFORMANCE</span>
                        </div>

                        <div className="mt-8 border-t border-[#64ffda]/30 pt-4">
                            <button className="w-full bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda] py-2 font-bold hover:bg-[#64ffda] hover:text-[#0a192f] transition-all uppercase text-sm tracking-widest">
                                Initialize Contact
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
