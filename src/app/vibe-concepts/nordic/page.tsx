
import React from 'react';

export default function NordicCleanPage() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#343A40] font-sans selection:bg-slate-200">
            {/* Navigation */}
            <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-semibold text-xl tracking-tight text-slate-900">Nordic.</div>
                    <div className="flex gap-8 text-sm font-medium text-slate-500">
                        <a href="#" className="hover:text-slate-900 transition-colors">Features</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Pricing</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">About</a>
                    </div>
                    <button className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-6xl mx-auto px-6 py-20">
                <div className="max-w-3xl">
                    <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-6 tracking-wide uppercase">
                        v2.0 is now live
                    </div>
                    <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                        Simplify your <br />
                        digital workspace.
                    </h1>
                    <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl">
                        A minimal, distraction-free environment designed for focus.
                        Strip away the noise and concentrate on what truly matters.
                    </p>
                    <div className="flex gap-4">
                        <button className="bg-slate-900 text-white px-8 py-4 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                            Start Free Trial
                        </button>
                        <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                            View Demo
                        </button>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
                    {[
                        { title: "Clean Interface", desc: "No clutter. Just the tools you need right where you expect them." },
                        { title: "Fast Performance", desc: "Built for speed with zero bloat to keep your workflow fluid." },
                        { title: "Secure by Default", desc: "Enterprise-grade security baked into every interaction." }
                    ].map((item, i) => (
                        <div key={i} className="group p-8 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-slate-100 transition-colors">
                                <div className="w-6 h-6 bg-slate-900 rounded-sm opacity-20"></div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                            <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Dashboard Preview */}
                <div className="mt-32 p-8 bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100">
                    <div className="flex gap-8 mb-8 border-b border-slate-100 pb-4">
                        <div className="font-bold text-slate-900 border-b-2 border-slate-900 pb-4 -mb-4.5">Overview</div>
                        <div className="text-slate-400">Activity</div>
                        <div className="text-slate-400">Settings</div>
                    </div>
                    <div className="h-64 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                        Dashboard Content Area
                    </div>
                </div>
            </main>
        </div>
    );
}
