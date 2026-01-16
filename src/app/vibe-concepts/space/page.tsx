
import React from 'react';

export default function SpacePage() {
    return (
        <div className="min-h-screen bg-[#030014] text-white font-sans overflow-hidden relative">

            {/* Stars Background */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a40] via-[#030014] to-black"></div>
            <div className="fixed inset-0 z-0 opacity-40"
                style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

            {/* Planet Glow */}
            <div className="fixed bottom-[-50%] left-[-10%] w-[120%] h-[100%] rounded-[50%] bg-[#4338ca] opacity-20 blur-[100px]"></div>

            <nav className="relative z-10 px-8 py-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#6366f1] rounded-full shadow-[0_0_10px_#6366f1]"></div>
                    <span className="text-xl font-light tracking-[0.3em]">ORBITAL</span>
                </div>
                <button className="px-6 py-2 border border-[#6366f1]/50 rounded-full text-xs tracking-widest hover:bg-[#6366f1]/20 transition-all text-[#a5b4fc] shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    SYSTEM LOGIN
                </button>
            </nav>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
                <h1 className="text-6xl md:text-8xl font-thin tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-[#6366f1]">
                    Explore <br />
                    the Unknown.
                </h1>
                <p className="text-xl text-[#a5b4fc] mb-12 max-w-xl mx-auto font-light leading-relaxed">
                    A user interface that feels infinite. Deep contrasts, glowing accents,
                    and a sense of weightlessness.
                </p>

                <div className="relative inline-block group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button className="relative px-12 py-5 bg-black rounded-full leading-none flex items-center divide-x divide-gray-600">
                        <span className="flex items-center space-x-5">
                            <span className="pr-6 text-gray-100">Launch Project</span>
                        </span>
                        <span className="pl-6 text-[#6366f1] group-hover:text-gray-100 transition duration-200">
                            &rarr;
                        </span>
                    </button>
                </div>

                {/* Floating Panels */}
                <div className="mt-32 grid md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-[#0f0f29]/50 backdrop-blur-md border border-[#6366f1]/20 p-8 rounded-2xl md:even:translate-y-12 hover:border-[#6366f1]/50 transition-colors duration-500 shadow-[0_0_30px_-5px_rgba(99,102,241,0.1)]">
                            <div className="text-4xl mb-4 opacity-80">
                                {i === 1 ? '🪐' : i === 2 ? '🚀' : '✨'}
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2 tracking-wide">Module {i}</h3>
                            <p className="text-[#a5b4fc] text-sm font-light">
                                Advanced telemetry and deep space communication protocols.
                            </p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
