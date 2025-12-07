
import React from 'react';

export default function LuxuryPage() {
    return (
        <div className="min-h-screen bg-black text-white font-serif selection:bg-white selection:text-black">

            {/* Header */}
            <header className="px-12 py-8 flex justify-between items-end border-b border-white/20">
                <h1 className="text-4xl tracking-widest uppercase font-light">Noir.</h1>
                <nav className="hidden md:flex gap-12 text-xs tracking-[0.2em] font-sans">
                    <a href="#" className="hover:text-white/70 transition-colors">COLLECTIONS</a>
                    <a href="#" className="hover:text-white/70 transition-colors">ATELIER</a>
                    <a href="#" className="hover:text-white/70 transition-colors">JOURNAL</a>
                </nav>
                <button className="text-xs tracking-[0.2em] font-sans border border-white/30 px-6 py-3 hover:bg-white hover:text-black transition-colors">
                    INQUIRE
                </button>
            </header>

            <main>
                {/* Hero */}
                <div className="grid lg:grid-cols-2 min-h-[80vh]">
                    <div className="flex flex-col justify-center px-12 py-20 border-r border-white/20">
                        <span className="text-xs font-sans tracking-[0.3em] text-white/50 mb-8">EST. 2024</span>
                        <h2 className="text-6xl md:text-8xl leading-none mb-12 font-light">
                            Silence <br />
                            <span className="italic font-normal">is luxury.</span>
                        </h2>
                        <p className="max-w-md text-white/70 leading-loose font-sans font-light text-sm mb-12">
                            In a world of noise, we design the void. A collection of digital experiences curated for the discerning few who value clarity above all else.
                        </p>
                        <div className="flex items-center gap-4 group cursor-pointer w-fit">
                            <span className="text-xs font-sans tracking-[0.2em] group-hover:underline underline-offset-8">EXPLORE THE EDITION</span>
                            <span className="text-xl group-hover:translate-x-2 transition-transform">→</span>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-[#111] flex items-center justify-center">
                        {/* Abstract Art Placeholder */}
                        <div className="w-[60%] aspect-[3/4] bg-neutral-900 border border-white/10 relative shadow-2xl shadow-black">
                            <div className="absolute inset-0 bg-gradient-to-tr from-black via-transparent to-white/5"></div>
                            <div className="absolute bottom-8 left-8 text-xs font-sans tracking-[0.2em]">FIG. 001</div>
                        </div>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/20">
                    {[
                        { number: '01', title: 'Precision', desc: 'Crafted to the pixel.' },
                        { number: '02', title: 'Elegance', desc: 'Beauty in restraint.' },
                        { number: '03', title: 'Timeless', desc: 'Beyond trends.' }
                    ].map((item) => (
                        <div key={item.number} className="p-12 border-r border-white/20 last:border-r-0 hover:bg-white/5 transition-colors group">
                            <div className="text-xs font-sans text-white/40 mb-32 group-hover:text-white transition-colors">{item.number}</div>
                            <h3 className="text-3xl italic mb-4">{item.title}</h3>
                            <p className="text-white/60 font-sans text-sm tracking-wide">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
