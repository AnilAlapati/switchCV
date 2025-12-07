
import React from 'react';

export default function TimelinePage() {
    return (
        <div className="min-h-screen bg-[#FDFBF7] font-serif overflow-x-auto">
            <div className="min-w-[200vw] h-screen p-12 flex flex-col justify-center relative">

                {/* The Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#E2E8F0] z-0"></div>

                <div className="flex items-center gap-32 px-20">

                    {/* Start Card */}
                    <div className="relative pt-32">
                        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2D3748] rounded-full border-4 border-[#FDFBF7] z-10"></div>
                        <div className="w-64">
                            <div className="text-4xl font-bold text-[#2D3748] mb-2">2018</div>
                            <p className="text-gray-500 italic">The beginning.</p>
                        </div>
                    </div>

                    {/* Exp 1 - Up */}
                    <div className="relative pb-32 -top-32">
                        <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2D3748] rounded-full border-4 border-[#FDFBF7] z-10"></div>
                        <div className="w-80 bg-white p-6 rounded-lg shadow-xl border border-gray-100 transform hover:-translate-y-2 transition-transform">
                            <img src="https://via.placeholder.com/300x150/f0f0f0/cccccc?text=University" alt="Uni" className="w-full h-32 object-cover rounded-md mb-4 grayscale hover:grayscale-0 transition-all" />
                            <h3 className="text-xl font-bold mb-1">Graduated CS</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Top of the class. Built a compiler in C++. Discovered a passion for distributed systems.
                            </p>
                        </div>
                    </div>

                    {/* Exp 2 - Down */}
                    <div className="relative pt-32 top-32">
                        <div className="absolute top-[-24px] left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2D3748] rounded-full border-4 border-[#FDFBF7] z-10"></div>
                        <div className="w-80 bg-white p-6 rounded-lg shadow-xl border border-gray-100 transform hover:-translate-y-2 transition-transform">
                            <div className="h-4 w-12 bg-blue-100 rounded mb-4"></div>
                            <h3 className="text-xl font-bold mb-1">Junior Dev @ Startup</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Fast-paced environment. Wore many hats. Learned React and Node.js in 2 weeks.
                            </p>
                        </div>
                    </div>

                    {/* Exp 3 - Up */}
                    <div className="relative pb-32 -top-32">
                        <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2D3748] rounded-full border-4 border-[#FDFBF7] z-10"></div>
                        <div className="w-80 bg-white p-6 rounded-lg shadow-xl border border-gray-100 transform hover:-translate-y-2 transition-transform">
                            <img src="https://via.placeholder.com/300x150/f0f0f0/cccccc?text=Big+Tech" alt="Corp" className="w-full h-32 object-cover rounded-md mb-4 grayscale hover:grayscale-0 transition-all" />
                            <h3 className="text-xl font-bold mb-1">Senior Engineer</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Leading a team of 5. Architecting microservices. Reduced latency by 40%.
                            </p>
                        </div>
                    </div>

                    {/* Future - Dashed Line */}
                    <div className="relative pt-32 opacity-50">
                        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-transparent border-2 border-dashed border-[#2D3748] rounded-full z-10"></div>
                        <div className="w-64">
                            <div className="text-4xl font-bold text-[#2D3748] mb-2">2025...</div>
                            <p className="text-gray-500 italic">Where we go next.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
