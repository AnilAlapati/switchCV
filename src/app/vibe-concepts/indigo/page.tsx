
import React from 'react';

export default function ModernIndigoPage() {
    return (
        <div className="min-h-screen bg-white text-[#1E1B4B] font-sans">
            {/* Header */}
            <header className="fixed w-full bg-white/90 backdrop-blur-lg z-50 border-b border-indigo-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#4F46E5] rounded-lg rotate-3"></div>
                        <span className="text-xl font-bold tracking-tight text-[#1E1B4B]">Pulse.</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-[#4338CA]">
                        <a href="#" className="hover:text-[#4F46E5]">Solutions</a>
                        <a href="#" className="hover:text-[#4F46E5]">Enterprise</a>
                        <a href="#" className="hover:text-[#4F46E5]">Developers</a>
                    </nav>
                    <div className="flex gap-4">
                        <button className="text-[#4338CA] font-medium text-sm hover:text-[#312E81]">Log in</button>
                        <button className="bg-[#4F46E5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4338CA] transition-colors shadow-lg shadow-indigo-500/30">
                            Get Access
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto cursor-default">
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-[#1E1B4B] mb-8">
                        Build faster with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#818CF8]">intelligent blocks.</span>
                    </h1>
                    <p className="text-xl text-[#6366F1] max-w-2xl mx-auto mb-10">
                        The modern standard for high-performance applications.
                        Vibrant, fast, and relentlessly focused on developer experience.
                    </p>

                    <div className="flex justify-center gap-4">
                        <button className="bg-[#1E1B4B] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#312E81] transition-all hover:scale-105">
                            Start Building
                        </button>
                        <div className="px-8 py-4 rounded-xl font-semibold text-lg text-[#1E1B4B] flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                            <span>View Documentation</span>
                            <span>→</span>
                        </div>
                    </div>
                </div>

                {/* Interface Mockup */}
                <div className="relative rounded-2xl overflow-hidden border border-indigo-100 shadow-2xl shadow-indigo-200/50 bg-[#F5F3FF]">
                    <div className="absolute top-0 w-full h-12 bg-white border-b border-indigo-50 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    </div>

                    <div className="pt-12 p-8 grid md:grid-cols-3 gap-8">
                        {/* Sidebar */}
                        <div className="space-y-2">
                            {['Overview', 'Analytics', 'Reports', 'Settings'].map((item, i) => (
                                <div key={item} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${i === 0 ? 'bg-[#4F46E5]/10 text-[#4F46E5]' : 'text-slate-500 hover:bg-white hover:text-[#4338CA]'}`}>
                                    {item}
                                </div>
                            ))}
                        </div>

                        {/* Main Content */}
                        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-indigo-50 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-[#1E1B4B]">Performance</h3>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">+12.5%</span>
                            </div>
                            <div className="h-40 flex items-end justify-between gap-2">
                                {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                                    <div key={i} className="w-full bg-[#4F46E5]" style={{ height: `${h}%`, opacity: 0.2 + (i * 0.1) }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
