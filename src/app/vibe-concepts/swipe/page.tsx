
import React from 'react';

export default function SwipeMatchPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans overflow-hidden">

            <div className="w-full max-w-md h-[700px] relative">
                {/* Background Cards (Stacked) */}
                <div className="absolute top-4 left-4 right-4 bottom-4 bg-white rounded-3xl shadow-lg transform scale-95 translate-y-4 opacity-50"></div>
                <div className="absolute top-2 left-2 right-2 bottom-2 bg-white rounded-3xl shadow-lg transform scale-[0.98] translate-y-2 opacity-80"></div>

                {/* Main Card */}
                <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

                    {/* Image / header area */}
                    <div className="h-2/5 bg-gradient-to-br from-blue-500 to-purple-600 relative p-6 flex flex-col justify-end text-white">
                        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                            98% MATCH
                        </div>
                        <h2 className="text-3xl font-bold leading-tight">Senior React Engineer</h2>
                        <p className="text-white/80 font-medium">Netflix • Remote</p>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Salary</span>
                            <p className="text-lg font-bold text-gray-800">$180k - $240k / year</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {['React', 'TypeScript', 'Node.js', 'GraphQL'].map(tag => (
                                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Why You'll Love It</span>
                            <p className="text-gray-600 text-sm leading-relaxed mt-1">
                                Work on the core streaming engine used by millions. Unlimited PTO, top-tier benefits, and a culture of freedom and responsibility.
                            </p>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="h-24 border-t border-gray-100 px-8 flex items-center justify-between bg-white">
                        <button className="w-14 h-14 rounded-full border-2 border-red-500 text-red-500 text-2xl flex items-center justify-center hover:bg-red-50 transition-colors">
                            ×
                        </button>
                        <button className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 text-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                            ★
                        </button>
                        <button className="w-14 h-14 rounded-full bg-green-500 text-white text-3xl flex items-center justify-center shadow-lg shadow-green-200 hover:scale-110 transition-transform">
                            ♥
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
