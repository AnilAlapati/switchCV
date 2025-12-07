
import React from 'react';

export default function EditorialPage() {
    return (
        <div className="min-h-screen bg-[#F0EFEB] text-[#1a1a1a] font-serif">
            {/* Grid Lines Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 flex justify-between max-w-7xl mx-auto px-6">
                <div className="border-r border-[#1a1a1a]/10 h-full"></div>
                <div className="border-r border-[#1a1a1a]/10 h-full"></div>
                <div className="border-r border-[#1a1a1a]/10 h-full"></div>
                <div className="border-r border-[#1a1a1a]/10 h-full hidden md:block"></div>
                <div className="border-r border-[#1a1a1a]/10 h-full hidden md:block"></div>
            </div>

            <nav className="relative z-10 border-b border-black py-6 px-6 bg-[#F0EFEB]">
                <div className="max-w-7xl mx-auto flex justify-between items-baseline">
                    <div className="text-4xl font-bold tracking-tighter">The Edition.</div>
                    <div className="text-sm font-sans tracking-wide uppercase hidden md:block">Issue No. 242 — Fall 2024</div>
                    <button className="text-sm font-sans uppercase underline decoration-1 underline-offset-4 hover:decoration-2">Subscribe</button>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20">

                {/* Hero Section */}
                <div className="grid md:grid-cols-12 gap-6 mb-32">
                    <div className="md:col-span-8">
                        <h1 className="text-7xl md:text-9xl font-light leading-[0.9] mb-8">
                            Design <br />
                            <span className="font-bold italic">Culture</span>
                        </h1>
                    </div>
                    <div className="md:col-span-4 flex flex-col justify-end">
                        <p className="font-sans text-lg leading-relaxed border-t border-black pt-6">
                            Exploring the intersection of technology and art. We look at how spacing, typography, and grid systems define the modern web.
                        </p>
                    </div>
                </div>

                {/* Image / Content Block */}
                <div className="grid md:grid-cols-2 gap-12 items-start border-t border-black pt-6">
                    <div className="aspect-[4/5] bg-[#dcdcdc] relative">
                        <div className="absolute inset-0 flex items-center justify-center text-[#1a1a1a]/20 text-6xl font-bold rotate-90">
                            IMAGE_01
                        </div>
                    </div>

                    <div className="space-y-12 sticky top-20">
                        <div>
                            <span className="font-sans text-xs font-bold uppercase tracking-widest block mb-4">01 — The Approach</span>
                            <h2 className="text-4xl leading-tight mb-6">
                                Structure gives freedom.
                            </h2>
                            <p className="font-sans text-gray-600 leading-relaxed text-lg">
                                By setting rigid rules, we create a playground for creativity. The grid isn't a cage; it's a foundation.
                            </p>
                        </div>

                        <div>
                            <span className="font-sans text-xs font-bold uppercase tracking-widest block mb-4">02 — The Typography</span>
                            <h2 className="text-4xl leading-tight mb-6">
                                Type is voice.
                            </h2>
                            <p className="font-sans text-gray-600 leading-relaxed text-lg">
                                Choosing the right typeface is 90% of web design. It carries the emotion, the weight, and the authority of the content.
                            </p>
                        </div>

                        <button className="bg-black text-white font-sans px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-[#333] transition-colors w-full md:w-auto">
                            Read Full Article
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
