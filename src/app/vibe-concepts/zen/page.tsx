
import React from 'react';

export default function ZenPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] flex justify-center selection:bg-[#d5d5d5]">

            {/* Floating Toolbar (Fade in on hover) */}
            <div className="fixed top-8 flex gap-6 opacity-20 hover:opacity-100 transition-opacity duration-500 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100">
                <button className="text-gray-400 hover:text-black font-serif italic">B</button>
                <button className="text-gray-400 hover:text-black font-serif italic">I</button>
                <div className="w-px h-4 bg-gray-200"></div>
                <button className="text-green-600 text-sm font-medium">Publish</button>
            </div>

            <main className="max-w-2xl w-full pt-32 pb-40 px-6">
                {/* Title Input */}
                <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full text-5xl md:text-6xl font-serif text-gray-800 placeholder:text-gray-300 outline-none bg-transparent mb-8"
                    defaultValue="Alex Rivera"
                />

                {/* Subtitle / Role */}
                <input
                    type="text"
                    placeholder="What you do"
                    className="w-full text-2xl font-serif text-gray-500 placeholder:text-gray-200 outline-none bg-transparent mb-16 italic"
                    defaultValue="Senior Product Designer based in Kyoto."
                />

                {/* Content Area - Like a long form article */}
                <div className="prose prose-lg prose-slate font-serif max-w-none">
                    <p className="text-xl text-gray-600 leading-relaxed mb-8">
                        I believe in craft. In the intersection of <span className="text-black bg-yellow-100 px-1">utility and beauty</span>.
                        My work spans over 10 years of building digital products that millions of people use every day.
                    </p>

                    <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 mt-12">Experience</h3>

                    <div className="group border-l-2 border-transparent hover:border-gray-200 pl-4 -ml-4 transition-colors duration-300 mb-12">
                        <div className="flex justify-between items-baseline mb-2">
                            <h4 className="text-2xl font-medium text-gray-900">Head of Design, Loom</h4>
                            <span className="text-sm text-gray-400 font-sans">2020 — Present</span>
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            Leading a team of 15 designers. Rebranded the core product identity. Established the new design system "Weave" which improved developer velocity by 30%.
                        </p>
                    </div>

                    <div className="group border-l-2 border-transparent hover:border-gray-200 pl-4 -ml-4 transition-colors duration-300 mb-12">
                        <div className="flex justify-between items-baseline mb-2">
                            <h4 className="text-2xl font-medium text-gray-900">Senior Designer, Airbnb</h4>
                            <span className="text-sm text-gray-400 font-sans">2016 — 2020</span>
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            Focused on the host experience. Designed the "Experiences" dashboard from 0 to 1. Conducted user research in 5 countries.
                        </p>
                    </div>

                    <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 mt-12">Philosophy</h3>
                    <blockquote className="border-l-4 border-gray-900 pl-6 italic text-gray-800 text-2xl font-light my-8">
                        "Good design is as little design as possible."
                    </blockquote>

                </div>
            </main>

        </div>
    );
}
