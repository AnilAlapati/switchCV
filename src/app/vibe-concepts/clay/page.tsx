
import React from 'react';

export default function ClayPage() {
    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans px-6 py-12 flex items-center justify-center">
            <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">

                {/* Left Content */}
                <div className="space-y-8">
                    <h1 className="text-6xl font-black text-[#2D3748] tracking-tight">
                        Playful <br />
                        <span className="text-[#5A67D8]">Interaction.</span>
                    </h1>
                    <p className="text-xl text-[#718096] leading-relaxed max-w-md">
                        Soft, puffy, and dimensional. Claymorphism adds a touch of childhood joy to digital interfaces.
                    </p>

                    <div className="flex gap-6">
                        <button className="bg-[#5A67D8] text-white text-lg font-bold px-8 py-4 rounded-3xl shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] active:shadow-[inset_4px_4px_8px_#434c9f,inset_-4px_-4px_8px_#7182ff] transition-all transform hover:-translate-y-1">
                            Get Started
                        </button>
                        <button className="bg-[#F0F4F8] text-[#5A67D8] text-lg font-bold px-8 py-4 rounded-3xl shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] transition-all">
                            Explore
                        </button>
                    </div>
                </div>

                {/* Clay Card */}
                <div className="bg-[#F0F4F8] p-10 rounded-[3rem] shadow-[20px_20px_40px_#d1d5db,-20px_-20px_40px_#ffffff] relative">

                    {/* Floating Elements */}
                    <div className="absolute -top-12 -right-8 w-24 h-24 bg-[#FC8181] rounded-full shadow-[8px_8px_16px_#d66e6e,-8px_-8px_16px_#ff9494] animate-bounce"></div>
                    <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-[#F6E05E] rounded-full shadow-[6px_6px_12px_#d1be50,-6px_-6px_12px_#ffff6c] animate-bounce delay-700"></div>

                    {/* Inner Card Content */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#4FD1C5] shadow-[6px_6px_12px_#43b2a7,-6px_-6px_12px_#5bf0e3] flex items-center justify-center text-white font-bold text-2xl">
                            C
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-[#F0F4F8] text-[#718096] font-bold text-sm shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]">
                            Volume 2
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-[#2D3748] mb-4">Daily Tracker</h2>

                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-[#F0F4F8] p-4 rounded-2xl flex items-center justify-between shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] cursor-pointer hover:scale-[1.02] transition-transform">
                                <div className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full bg-[#CBD5E0] shadow-[inset_2px_2px_4px_#a0aec0]"></div>
                                    <span className="font-bold text-[#4A5568]">Task Item {i}</span>
                                </div>
                                <span className="text-[#A0AEC0] font-bold">...</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8">
                        <div className="h-4 bg-[#F0F4F8] rounded-full w-full shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] overflow-hidden">
                            <div className="h-full w-2/3 bg-[#5A67D8] rounded-full shadow-[2px_2px_4px_#434c9f]"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
