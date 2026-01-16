
import React from 'react';

export default function KanbanPage() {
    return (
        <div className="min-h-screen bg-[#0079BF] p-4 font-sans overflow-x-auto text-sm text-[#172b4d]">
            <div className="flex h-full gap-3 items-start">

                {/* List: Applied */}
                <div className="w-72 bg-[#ebecf0] rounded-md p-2 flex-shrink-0 max-h-full flex flex-col">
                    <h3 className="text-sm font-bold px-2 py-2 text-[#172b4d] flex justify-between">
                        <span>Applied (12)</span>
                        <span className="text-gray-500">•••</span>
                    </h3>
                    <div className="overflow-y-auto space-y-2 px-1">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-[#f4f5f7]">
                                <div className="flex gap-2 max-w-full mb-1">
                                    <div className="h-1 w-8 bg-green-500 rounded-full"></div>
                                    <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
                                </div>
                                <p className="no-underline text-[#172b4d]">Senior Frontend Engineer</p>
                                <div className="mt-2 flex items-center justify-between text-gray-500 text-xs">
                                    <span className="flex items-center gap-1">≡ 24 Jan</span>
                                    <div className="w-6 h-6 rounded-full bg-gray-200 text-[10px] flex items-center justify-center">AB</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-2 py-2 text-[#5e6c84] hover:bg-[#00000014] rounded cursor-pointer mt-1">
                        + Add a card
                    </div>
                </div>

                {/* List: Phone Screen */}
                <div className="w-72 bg-[#ebecf0] rounded-md p-2 flex-shrink-0 max-h-full flex flex-col">
                    <h3 className="text-sm font-bold px-2 py-2 text-[#172b4d] flex justify-between">
                        <span>Phone Screen (4)</span>
                        <span className="text-gray-500">•••</span>
                    </h3>
                    <div className="overflow-y-auto space-y-2 px-1">
                        <div className="bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-[#f4f5f7]">
                            <div className="flex gap-2 max-w-full mb-1">
                                <div className="h-1 w-8 bg-yellow-500 rounded-full"></div>
                            </div>
                            <p className="no-underline text-[#172b4d]">Product Designer - Stripe</p>
                            <div className="mt-2 flex items-center justify-between text-gray-500 text-xs">
                                <span className="flex items-center gap-1">👁 Follow up tomorrow</span>
                            </div>
                        </div>
                    </div>
                    <div className="px-2 py-2 text-[#5e6c84] hover:bg-[#00000014] rounded cursor-pointer mt-1">
                        + Add a card
                    </div>
                </div>

                {/* List: Interviewing */}
                <div className="w-72 bg-[#ebecf0] rounded-md p-2 flex-shrink-0 max-h-full flex flex-col">
                    <h3 className="text-sm font-bold px-2 py-2 text-[#172b4d] flex justify-between">
                        <span>On-Site Interview (2)</span>
                        <span className="text-gray-500">•••</span>
                    </h3>
                    <div className="overflow-y-auto space-y-2 px-1">
                        <div className="bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-[#f4f5f7] border-2 border-blue-400">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://via.placeholder.com/260x100?text=System+Design" alt="Cover" className="rounded-t-sm mb-2 w-full h-16 object-cover" />
                            <p className="no-underline text-[#172b4d]">Tech Lead - Uber</p>
                            <div className="mt-2 text-xs text-red-600 font-bold bg-red-50 p-1 rounded inline-block">
                                Tomorrow at 2PM
                            </div>
                        </div>
                    </div>
                    <div className="px-2 py-2 text-[#5e6c84] hover:bg-[#00000014] rounded cursor-pointer mt-1">
                        + Add a card
                    </div>
                </div>

                {/* List: Offer */}
                <div className="w-72 bg-[#ebecf0] rounded-md p-2 flex-shrink-0 max-h-full flex flex-col">
                    <h3 className="text-sm font-bold px-2 py-2 text-[#172b4d] flex justify-between">
                        <span>Offers 3 🎉</span>
                        <span className="text-gray-500">•••</span>
                    </h3>
                    <div className="overflow-y-auto space-y-2 px-1 relative">
                        <div className="bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-[#f4f5f7]">
                            <div className="flex gap-2 max-w-full mb-1">
                                <div className="h-1 w-8 bg-green-500 rounded-full"></div>
                            </div>
                            <p className="no-underline text-[#172b4d]">Staff Engineer - Vercel</p>
                            <div className="mt-2 flex items-center gap-2 text-gray-500 text-xs">
                                <span className="bg-green-100 text-green-800 px-1 rounded font-bold">$210k</span>
                                <span className="bg-blue-100 text-blue-800 px-1 rounded font-bold">Remote</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Button */}
                <div className="bg-[#ffffff3d] text-white px-3 py-2 rounded font-bold text-sm cursor-pointer hover:bg-[#ffffff52]">
                    + Add another list
                </div>

            </div>
        </div>
    );
}
