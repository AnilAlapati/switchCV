
import React from 'react';

export default function TerminalPage() {
    return (
        <div className="min-h-screen bg-black text-[#00ff00] font-mono p-4 md:p-12 overflow-hidden">
            <div className="max-w-4xl mx-auto border border-[#00ff00]/30 p-1 min-h-[80vh] relative shadow-[0_0_20px_rgba(0,255,0,0.1)]">

                {/* Terminal Header */}
                <div className="bg-[#00ff00]/10 border-b border-[#00ff00]/30 px-4 py-2 flex justify-between items-center text-xs">
                    <span>USER: ROOT</span>
                    <span>SSH: ENCRYPTED</span>
                    <span>LOC: /DEV/NULL</span>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 space-y-6">

                    <div>
                        <span className="text-white opacity-50">root@mainframe:~$</span>
                        <span className="text-white ml-2 typing-effect">init_system --force</span>
                    </div>

                    <div className="pl-4 border-l border-[#00ff00]/30 py-2 space-y-1 text-sm text-[#00ff00]/80">
                        <p>&gt; Loading kernel modules... [OK]</p>
                        <p>&gt; Mounting filesystems... [OK]</p>
                        <p>&gt; Establishing secure uplink... [OK]</p>
                        <p>&gt; System ready.</p>
                    </div>

                    <div className="pt-8">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">
                            &lt;CODE_BASE /&gt;
                        </h1>
                        <p className="text-xl max-w-2xl mb-8 leading-relaxed text-[#00ff00]/70">
                            The raw power of command line.
                            No GUIs. No distractions.
                            Pure efficiency for the elite.
                        </p>

                        <div className="grid gap-4 md:grid-cols-2 max-w-lg">
                            <button className="border border-[#00ff00] px-6 py-3 text-left hover:bg-[#00ff00] hover:text-black transition-colors group">
                                <span className="mr-4 group-hover:animate-pulse">&gt;</span>
                                EXECUTE_PLAN_A
                            </button>
                            <button className="border border-[#00ff00] px-6 py-3 text-left hover:bg-[#00ff00] hover:text-black transition-colors group">
                                <span className="mr-4 group-hover:animate-pulse">&gt;</span>
                                READ_DOCS
                            </button>
                            <button className="border border-[#00ff00] px-6 py-3 text-left hover:bg-[#00ff00] hover:text-black transition-colors group opacity-50 cursor-not-allowed">
                                <span className="mr-4">#</span>
                                ACCESS_DENIED
                            </button>
                        </div>
                    </div>

                    {/* Input Line */}
                    <div className="mt-12 flex items-center gap-2 animate-pulse">
                        <span className="text-white opacity-50">root@mainframe:~$</span>
                        <div className="w-3 h-5 bg-[#00ff00]"></div>
                    </div>

                </div>

                {/* Scan line effect */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
            </div>
        </div>
    );
}
