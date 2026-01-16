
import React from 'react';

export default function SunsetPage() {
    return (
        <div className="min-h-screen font-sans text-white bg-black relative overflow-hidden">

            {/* Mesh Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 blur-[120px] opacity-60 animate-pulse duration-10000"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 blur-[120px] opacity-60 animate-pulse duration-7000 delay-1000"></div>


            <nav className="relative z-10 px-8 py-6 flex justify-between items-center backdrop-blur-sm bg-white/5 border-b border-white/10">
                <div className="text-xl font-bold tracking-tight">Horizon.</div>
                <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2 rounded-full text-sm font-medium transition-colors border border-white/20">
                    Sign In
                </button>
            </nav>

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-32 text-center">
                <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-200 to-pink-200">
                        Chasing
                    </span> <br />
                    the moment.
                </h1>

                <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                    Capture life in vibrant color. A visual experience designed
                    to evoke emotion and inspire creativity.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button className="px-10 py-5 rounded-full bg-white text-purple-900 font-bold text-lg hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)] transition-shadow">
                        Start Now
                    </button>
                    <div className="flex items-center gap-2 text-white/80 hover:text-white cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                            ▶
                        </div>
                        <span className="font-medium">Watch the film</span>
                    </div>
                </div>

                {/* Cards */}
                <div className="mt-32 grid md:grid-cols-3 gap-8 text-left">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-3xl hover:-translate-y-2 transition-transform duration-500">
                            <div className={`w-12 h-12 rounded-2xl mb-4 bg-gradient-to-br ${i === 1 ? 'from-orange-400 to-pink-500' :
                                    i === 2 ? 'from-pink-500 to-purple-600' :
                                        'from-purple-500 to-blue-500'
                                }`}></div>
                            <h3 className="text-xl font-bold mb-2">Feature {i}</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Beautifully crafted details that bring joy to your everyday workflow.
                            </p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
