
import React from 'react';

export default function RetroPage() {
    return (
        <div className="min-h-screen bg-[#008080] font-sans p-2 md:p-8 flex items-center justify-center">
            {/* Desktop Icons */}
            <div className="fixed top-8 left-8 flex flex-col gap-8 text-white text-center w-20">
                <div className="cursor-pointer group">
                    <div className="text-4xl mb-1">💻</div>
                    <div className="text-sm bg-[#008080] group-hover:bg-[#000080] px-1 dotted-border">My PC</div>
                </div>
                <div className="cursor-pointer group">
                    <div className="text-4xl mb-1">🗑️</div>
                    <div className="text-sm bg-[#008080] group-hover:bg-[#000080] px-1">Recycle Bin</div>
                </div>
            </div>

            {/* Main Window */}
            <div className="bg-[#c0c0c0] p-[2px] shadow-[2px_2px_0px_white,-2px_-2px_0px_#404040] w-full max-w-3xl">
                {/* Title Bar */}
                <div className="bg-[#000080] px-2 py-1 flex justify-between items-center text-white font-bold">
                    <div className="flex items-center gap-2">
                        <span>Welcome_to_Retro_OS.exe</span>
                    </div>
                    <div className="flex gap-1">
                        <button className="bg-[#c0c0c0] text-black w-5 h-5 flex items-center justify-center text-xs font-bold leading-none shadow-[inset_-1px_-1px_#444,inset_1px_1px_#fff]">_</button>
                        <button className="bg-[#c0c0c0] text-black w-5 h-5 flex items-center justify-center text-xs font-bold leading-none shadow-[inset_-1px_-1px_#444,inset_1px_1px_#fff]">□</button>
                        <button className="bg-[#c0c0c0] text-black w-5 h-5 flex items-center justify-center text-xs font-bold leading-none shadow-[inset_-1px_-1px_#444,inset_1px_1px_#fff]">×</button>
                    </div>
                </div>

                {/* Menu Bar */}
                <div className="flex gap-4 px-2 py-1 text-sm border-b border-white shadow-[0px_1px_0px_#808080]">
                    <span className="underline cursor-pointer">F</span>ile
                    <span className="underline cursor-pointer">E</span>dit
                    <span className="underline cursor-pointer">V</span>iew
                    <span className="underline cursor-pointer">H</span>elp
                </div>

                {/* Content Area */}
                <div className="p-6">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-48 bg-white border-2 border-[#808080] border-r-white border-b-white shadow-[inset_1px_1px_0px_#000] p-4 hidden md:block">
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2 items-center cursor-pointer hover:bg-[#000080] hover:text-white px-1">
                                    <span>📁</span> Documents
                                </li>
                                <li className="flex gap-2 items-center cursor-pointer hover:bg-[#000080] hover:text-white px-1">
                                    <span>💿</span> Programs
                                </li>
                                <li className="flex gap-2 items-center cursor-pointer hover:bg-[#000080] hover:text-white px-1">
                                    <span>⚙️</span> Control Panel
                                </li>
                            </ul>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-6 font-serif">Welcome to the 90s.</h1>
                            <p className="mb-6 font-serif">
                                Experience the nostalgia of classic computing. Simple, functional, and surprisingly productive.
                                No notifications, no trackers, just you and the machine.
                            </p>

                            <div className="bg-white border-2 border-[#808080] border-r-white border-b-white shadow-[inset_1px_1px_0px_#000] p-4 mb-8 h-32 overflow-y-scroll">
                                <p className="font-mono text-xs">
                                    C:\&gt; RUN SYSTEM_CHECK<br />
                                    Processing...<br />
                                    Memory OK.<br />
                                    Graphics OK.<br />
                                    Sound Blaster OK.<br />
                                    C:\&gt; _
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button className="px-6 py-1 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-[1px_1px_0px_black] active:border-black active:border-r-white active:border-b-white active:shadow-none font-bold">
                                    Cancel
                                </button>
                                <button className="px-6 py-1 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-[1px_1px_0px_black] active:border-black active:border-r-white active:border-b-white active:shadow-none font-bold ring-1 ring-black ring-inset">
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="border-t border-[#808080] shadow-[0px_1px_0px_white] px-2 py-0.5 text-xs flex justify-between bg-[#c0c0c0]">
                    <span>1 Object(s) selected</span>
                    <span>42.0 KB</span>
                </div>
            </div>

            {/* Start Bar */}
            <div className="fixed bottom-0 left-0 w-full h-10 bg-[#c0c0c0] border-t-2 border-white shadow-[0px_-1px_0px_#fff] flex items-center px-1 z-50">
                <button className="px-2 py-1 flex items-center gap-1 font-bold bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-[1px_1px_0px_black] active:border-black active:border-r-white active:border-b-white active:shadow-none">
                    <span className="text-lg">🪟</span> Start
                </button>
                <div className="border-l border-[#808080] border-r border-white h-full mx-2"></div>
                <button className="px-4 py-1 flex items-center gap-2 bg-[#c0c0c0] border-2 border-black border-r-white border-b-white shadow-[inset_1px_1px_0px_black] active:bg-[#c0c0c0]">
                    Welcome_to_Retro...
                </button>
                <div className="ml-auto border-2 border-[#808080] border-r-white border-b-white shadow-[inset_1px_1px_0px_black] px-3 py-1 bg-[#c0c0c0] text-xs">
                    12:00 PM
                </div>
            </div>

        </div>
    );
}
