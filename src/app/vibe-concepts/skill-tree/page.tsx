
import React from 'react';

export default function SkillTreePage() {
    return (
        <div className="min-h-screen bg-[#1A202C] text-white font-sans flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-12 text-center text-[#E2E8F0]">Career Progression</h1>

            {/* Connection Lines (SVG) this would be complex in logic, doing simplified CSS lines here */}
            <div className="relative w-full max-w-4xl">
                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#2D3748] -translate-x-1/2"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">

                    {/* Column 1: Frontend */}
                    <div className="flex flex-col gap-12 items-center">
                        <h2 className="text-xl font-bold text-[#63B3ED]">Frontend Mage</h2>

                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full border-4 border-[#4299E1] bg-[#2C5282] flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(66,153,225,0.5)]">
                                ⚛️
                            </div>
                            <div className="mt-2 text-center font-bold text-sm">React Master</div>
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 bg-[#2D3748] p-3 rounded-lg text-xs hidden group-hover:block z-20 border border-[#4A5568]">
                                Level 50 <br />
                                +20% Rendering Speed <br />
                                Unlocked: Server Components
                            </div>
                        </div>

                        <div className="w-1 h-8 bg-[#4299E1]"></div>

                        <div className="w-16 h-16 rounded-full border-4 border-[#2D3748] bg-[#1A202C] flex items-center justify-center text-2xl grayscale opacity-50">
                            🎨
                        </div>
                    </div>


                    {/* Column 2: Core (Already Unlocked) */}
                    <div className="flex flex-col gap-12 items-center pt-24">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-[#F6E05E] bg-[#744210] flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(246,224,94,0.4)] animate-pulse">
                                👑
                            </div>
                            <div className="mt-2 text-center font-bold text-[#F6E05E]">Tech Lead</div>
                        </div>
                    </div>


                    {/* Column 3: Backend */}
                    <div className="flex flex-col gap-12 items-center">
                        <h2 className="text-xl font-bold text-[#F687B3]">Backend Sorcerer</h2>

                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full border-4 border-[#ED64A6] bg-[#702459] flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(237,100,166,0.5)]">
                                🐘
                            </div>
                            <div className="mt-2 text-center font-bold text-sm">PostgreSQL</div>
                        </div>

                        <div className="w-1 h-8 bg-[#ED64A6]"></div>

                        <div className="w-16 h-16 rounded-full border-4 border-[#ED64A6] bg-[#702459] flex items-center justify-center text-2xl">
                            🐳
                        </div>
                    </div>

                </div>
            </div>

            <div className="mt-16 px-6 py-3 bg-[#2D3748] rounded-full flex items-center gap-4 border border-[#4A5568]">
                <span className="text-[#A0AEC0]">Available Skill Points:</span>
                <span className="text-2xl font-bold text-[#F6E05E]">3</span>
            </div>
        </div>
    );
}
