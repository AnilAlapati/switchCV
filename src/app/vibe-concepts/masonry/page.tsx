
import React from 'react';

export default function MasonryPage() {
    return (
        <div className="min-h-screen bg-white p-8">

            {/* Search Header */}
            <div className="fixed top-0 left-0 right-0 bg-white z-50 px-8 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl">
                    P
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-12 px-6 flex items-center text-gray-500 font-bold">
                    Search your inspiration...
                </div>
                <div className="flex gap-4 font-bold text-gray-500">
                    <span>Home</span>
                    <span>Explore</span>
                    <span>Create</span>
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto mt-24">
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">

                    {/* Profile Card */}
                    <div className="break-inside-avoid rounded-3xl overflow-hidden relative group">
                        <div className="bg-black text-white p-8 text-center min-h-[300px] flex flex-col justify-center items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white mb-4 bg-gray-800"></div>
                            <h1 className="text-2xl font-bold">Anil Alapati</h1>
                            <p className="text-gray-400 mt-2">Product Designer & Developer</p>
                            <button className="mt-6 bg-red-600 px-6 py-2 rounded-full font-bold">Follow</button>
                        </div>
                    </div>

                    {/* Image Card 1 */}
                    <div className="break-inside-avoid rounded-3xl overflow-hidden relative group cursor-pointer">
                        <div className="bg-gray-200 h-[400px] w-full relative">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-lg">Project Alpha</div>
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <span className="text-white font-bold text-xl">UI Design System</span>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-white text-xs underline">Read Case Study ↗</span>
                                    <button className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Card - Experience */}
                    <div className="break-inside-avoid bg-[#E9F5F5] rounded-3xl p-6 relative group cursor-zoom-in">
                        <h2 className="text-xl font-bold text-[#006B6B] mb-2">Senior Experience</h2>
                        <p className="font-serif text-lg leading-relaxed text-[#004d4d]">
                            Led the redesign of the core checkout flow, resulting in a 15% uplift in conversion. Managed a team of 4 juniors.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <span className="bg-white/50 px-2 py-1 rounded text-xs text-[#006B6B] font-bold">Leadership</span>
                            <span className="bg-white/50 px-2 py-1 rounded text-xs text-[#006B6B] font-bold">UX Research</span>
                        </div>
                    </div>

                    {/* Image Card 2 - Tall */}
                    <div className="break-inside-avoid rounded-3xl overflow-hidden relative group cursor-pointer">
                        <div className="bg-blue-100 h-[500px] w-full flex items-center justify-center">
                            <span className="text-blue-900 font-bold transform rotate-90 text-4xl tracking-widest uppercase">Mobile App</span>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <button className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm self-end">Save</button>
                        </div>
                    </div>


                    {/* List Card - Skills */}
                    <div className="break-inside-avoid bg-[#FFF8E1] rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-[#5D4037] mb-4">Core Stack</h2>
                        <div className="flex flex-wrap gap-2">
                            {['React Native', 'Swift', 'Kotlin', 'Figma', 'Protopie', 'Next.js'].map(s => (
                                <div key={s} className="px-4 py-3 bg-white rounded-xl font-bold text-[#5D4037] text-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quote Card */}
                    <div className="break-inside-avoid bg-black text-white rounded-3xl p-8 text-center">
                        <p className="font-serif text-2xl italic">"Simplicity is the ultimate sophistication."</p>
                        <p className="mt-4 text-gray-500 text-sm">— Leonardo da Vinci</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
