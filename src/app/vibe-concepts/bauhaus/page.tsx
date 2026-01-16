
import React from 'react';

export default function BauhausPage() {
    return (
        <div className="min-h-screen bg-[#F4F4F1] text-black font-sans relative overflow-hidden">

            {/* Geometric Decorations */}
            <div className="absolute top-0 right-0 w-[50vw] h-screen bg-[#E93A36] clip-path-diagonal"></div>
            <div className="absolute bottom-20 left-20 w-32 h-32 rounded-full bg-[#004C95] z-0"></div>
            <div className="absolute top-40 left-1/2 w-20 h-20 bg-[#FNB914]"></div>

            <nav className="relative z-10 px-12 py-8 flex justify-between items-center bg-white border-b-4 border-black">
                <div className="text-3xl font-black uppercase tracking-widest text-black">Bauhaus.</div>
                <div className="hidden md:flex gap-0 border-l-4 border-black">
                    <a href="#" className="px-8 py-2 hover:bg-[#FNB914] transition-colors font-bold border-r-4 border-black">Work</a>
                    <a href="#" className="px-8 py-2 hover:bg-[#004C95] hover:text-white transition-colors font-bold border-r-4 border-black">Studio</a>
                    <a href="#" className="px-8 py-2 hover:bg-[#E93A36] hover:text-white transition-colors font-bold">Contact</a>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-12 py-20 flex flex-col md:flex-row items-center gap-12">

                <div className="md:w-1/2 bg-white border-4 border-black p-12 shadow-[12px_12px_0px_0px_#000]">
                    <h1 className="text-7xl font-black leading-none mb-8">
                        FORM <br />
                        FOLLOWS <br />
                        <span className="text-[#004C95]">FUNCTION.</span>
                    </h1>
                    <p className="text-xl font-bold mb-8 border-l-8 border-[#FNB914] pl-6 leading-relaxed">
                        Return to the basics. Geometric shapes, primary colors, and structural clarity. Art into industry.
                    </p>
                    <button className="bg-black text-white px-10 py-5 text-xl font-bold hover:bg-[#E93A36] transition-colors">
                        ENTER STUDIO
                    </button>
                </div>

                <div className="md:w-1/2 grid grid-cols-2 gap-4">
                    <div className="aspect-square bg-[#004C95] border-4 border-black flex items-center justify-center">
                        <div className="w-1/2 h-1/2 bg-white rounded-full"></div>
                    </div>
                    <div className="aspect-square bg-[#FNB914] border-4 border-black flex items-center justify-center">
                        <div className="w-1/2 h-1/2 bg-white rotate-45"></div>
                    </div>
                    <div className="aspect-square bg-[#E93A36] border-4 border-black flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[40px] border-l-transparent border-b-[60px] border-b-white border-r-[40px] border-r-transparent"></div>
                    </div>
                    <div className="aspect-square bg-white border-4 border-black flex items-center justify-center relative overflow-hidden">
                        <div className="absolute w-full h-4 bg-black rotate-45"></div>
                        <div className="absolute w-full h-4 bg-black -rotate-45"></div>
                    </div>
                </div>

            </main>

            {/* Footer Strip */}
            <div className="fixed bottom-0 w-full h-4 flex">
                <div className="w-1/3 bg-[#004C95]"></div>
                <div className="w-1/3 bg-[#E93A36]"></div>
                <div className="w-1/3 bg-[#FNB914] bg-[#FFD700]"></div>
                {/* Adjusted yellow hex roughly */}
            </div>
        </div>
    );
}
