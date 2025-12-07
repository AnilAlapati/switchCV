
import React from 'react';

export default function CyberpunkPage() {
    return (
        <div className="min-h-screen bg-[#050510] text-[#00f3ff] font-mono selection:bg-[#ff003c] selection:text-white overflow-x-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    perspective: '1000px',
                    transform: 'rotateX(20deg) scale(1.5)'
                }}>
            </div>

            <nav className="relative z-10 border-b border-[#00f3ff]/30 bg-[#050510]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="text-3xl font-black tracking-tighter italic" style={{ textShadow: '2px 2px 0px #ff003c' }}>
                        CYBER.NET
                    </div>
                    <button className="px-6 py-2 bg-[#ff003c] text-white font-bold uppercase tracking-widest hover:bg-[#ff2a5d] transition-colors clip-path-button" style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}>
                        Connect_
                    </button>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-block px-2 py-1 mb-6 border border-[#00f3ff] text-[#00f3ff] text-xs uppercase tracking-[0.2em]">
                            System Status: Online
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-none glitch-text">
                            THE FUTURE <br />
                            IS <span className="text-[#ff003c]">NOW.</span>
                        </h1>
                        <p className="text-lg text-gray-400 mb-12 max-w-lg border-l-2 border-[#ff003c] pl-6">
                            Hack the planet. Decentralized networks, high-velocity data streams, and zero latency. Welcome to the grid.
                        </p>

                        <div className="flex gap-6">
                            <button className="px-8 py-4 bg-[#00f3ff] text-black font-bold text-lg uppercase hover:bg-white transition-colors" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 90% 100%, 0 100%)' }}>
                                Initialize Protocol
                            </button>
                        </div>
                    </div>

                    {/* Cyber Card */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#ff003c] opacity-20 blur-xl transform translate-x-4 translate-y-4"></div>
                        <div className="bg-[#0a0a1a] border border-[#00f3ff]/50 p-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-[10px] text-[#00f3ff]">VN-2077</div>

                            <div className="border border-[#00f3ff]/20 p-8">
                                <div className="flex justify-between items-end mb-8 border-b border-[#00f3ff]/20 pb-4">
                                    <div>
                                        <div className="text-gray-500 text-xs uppercase mb-1">Target</div>
                                        <div className="text-2xl font-bold text-white">Mainframe</div>
                                    </div>
                                    <div className="text-[#ff003c] font-mono animate-pulse">
                                        ● DISCONNECTED
                                    </div>
                                </div>

                                <div className="space-y-4 font-mono text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">CPU_LOAD</span>
                                        <span className="text-[#00f3ff]">98%</span>
                                    </div>
                                    <div className="h-2 bg-[#00f3ff]/20 w-full overflow-hidden">
                                        <div className="h-full bg-[#ff003c] w-[98%]"></div>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-gray-500">MEM_ALLOC</span>
                                        <span className="text-[#00f3ff]">42TB</span>
                                    </div>
                                    <div className="h-2 bg-[#00f3ff]/20 w-full overflow-hidden">
                                        <div className="h-full bg-[#00f3ff] w-[65%]"></div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-[#00f3ff]/20 text-center text-xs uppercase text-gray-500 tracking-widest">
                                    Encrypted Connection
                                </div>
                            </div>
                        </div>
                        {/* Glitch elements */}
                        <div className="absolute -left-2 top-10 w-1 h-20 bg-[#ff003c]"></div>
                        <div className="absolute -right-2 bottom-10 w-1 h-20 bg-[#00f3ff]"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
