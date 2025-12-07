
import React from 'react';

export default function TickerPage() {
    return (
        <div className="min-h-screen bg-[#111111] text-[#00ff00] font-mono p-4">
            {/* Top Ticker */}
            <div className="w-full bg-[#222] border-b border-[#333] p-2 flex overflow-hidden whitespace-nowrap text-xs">
                <span className="mr-8">REACT ▲ 12.5%</span>
                <span className="mr-8 text-red-500">JQUERY ▼ 2.1%</span>
                <span className="mr-8">PYTHON ▲ 5.4%</span>
                <span className="mr-8">AI_ENGINEERING ▲▲ 45.2%</span>
                <span className="mr-8 text-yellow-500">JAVA ▬ 0.0%</span>
                <span className="mr-8">REACT ▲ 12.5%</span>
                <span className="mr-8 text-red-500">JQUERY ▼ 2.1%</span>
                <span className="mr-8">PYTHON ▲ 5.4%</span>
                <span className="mr-8">AI_ENGINEERING ▲▲ 45.2%</span>
            </div>

            <div className="grid grid-cols-12 gap-1 h-[calc(100vh-60px)] mt-1">

                {/* Main Chart */}
                <div className="col-span-8 bg-[#1a1a1a] border border-[#333] p-4 relative">
                    <div className="absolute top-4 left-4">
                        <h1 className="text-2xl font-bold text-white mb-1">MARKET VALUE</h1>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold">$220,000</span>
                            <span className="text-sm mb-1 text-[#00ff00]">+15% YOY</span>
                        </div>
                    </div>

                    {/* Fake Chart Lines */}
                    <div className="w-full h-full flex items-end justify-between pt-24 pb-8 px-4">
                        <div className="w-full h-full border-l border-b border-[#333] relative">
                            <svg className="absolute bottom-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                                <polyline
                                    points="0,300 100,280 200,250 300,270 400,200 500,150 600,100 700,50 800,20"
                                    fill="none"
                                    stroke="#00ff00"
                                    strokeWidth="2"
                                />
                                {/* area tag removed due to build error: property xmlns does not exist on area HTML element when inside SVG context in TS/Next.js */}
                                {/* Gradient fill effect could be added here */}
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Side Panel Data */}
                <div className="col-span-4 flex flex-col gap-1">
                    <div className="bg-[#1a1a1a] border border-[#333] p-4 flex-1">
                        <h3 className="text-white border-b border-[#333] pb-2 mb-2 font-bold">TOP SKILLS (HOLDINGS)</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[#666] text-xxs">
                                    <th className="text-left font-normal">SYM</th>
                                    <th className="text-right font-normal">VAL</th>
                                    <th className="text-right font-normal">CHG</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                <tr>
                                    <td className="py-2 text-white font-bold">TS</td>
                                    <td className="py-2 text-right">98.00</td>
                                    <td className="py-2 text-right text-[#00ff00]">+4.2%</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-white font-bold">NODE</td>
                                    <td className="py-2 text-right">92.50</td>
                                    <td className="py-2 text-right text-[#00ff00]">+1.8%</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-white font-bold">AWS</td>
                                    <td className="py-2 text-right">85.00</td>
                                    <td className="py-2 text-right text-[#00ff00]">+12.4%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#333] p-4 h-1/3">
                        <h3 className="text-white border-b border-[#333] pb-2 mb-2 font-bold">NEWS FEED</h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex gap-2">
                                <span className="text-[#666]">10:42</span>
                                <span className="text-white">Recruiter viewed profile: "Impressive stack"</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[#666]">09:15</span>
                                <span className="text-white">Application sent to Google (Probability: 12%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
