
import React from 'react';

export default function NeoBrutalismPage() {
    return (
        <div className="min-h-screen bg-[#E0E7FF] text-black font-mono">
            {/* Navbar */}
            <nav className="border-b-4 border-black bg-white p-6 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-3xl font-black uppercase tracking-tighter bg-[#A5B4FC] px-2 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        NEO.VIBE
                    </div>
                    <div className="flex gap-4">
                        <button className="px-6 py-2 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all bg-[#FCD34D]">
                            Login
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    <div className="space-y-8">
                        <div className="inline-block bg-[#F472B6] border-2 border-black px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            NEW FEATURE DROP
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tight">
                            MAKE IT<br />
                            <span className="text-white bg-black px-2">POP.</span>
                        </h1>
                        <p className="text-xl font-bold max-w-md border-l-4 border-black pl-6">
                            Stop blending in. Stand out with high contrast, bold borders, and zero apologies.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button className="px-8 py-4 bg-[#4ADE80] text-black text-xl font-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all">
                                START NOW
                            </button>
                            <button className="px-8 py-4 bg-white text-black text-xl font-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all">
                                DOCS -&gt;
                            </button>
                        </div>
                    </div>

                    {/* Visual Element */}
                    <div className="relative">
                        <div className="bg-white border-4 border-black p-8 rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] z-10 relative">
                            <h2 className="text-4xl font-black mb-6 uppercase border-b-4 border-black pb-2">Top Stats</h2>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between items-center p-4 border-2 border-black bg-[#E0E7FF] hover:bg-[#A5B4FC] transition-colors cursor-pointer">
                                        <span className="font-bold">METRIC_0{i}</span>
                                        <span className="font-black text-xl">{90 + i * 2}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Decorative Elements */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FCD34D] border-4 border-black rounded-full z-0 flex items-center justify-center font-black text-2xl animate-bounce">
                            WOW!
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
