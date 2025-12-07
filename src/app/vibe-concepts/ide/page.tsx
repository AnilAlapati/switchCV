
import React from 'react';

export default function IDEPage() {
    return (
        <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4] font-mono flex text-sm overflow-hidden">

            {/* Activity Bar */}
            <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 border-r border-[#000]">
                {/* Icons are fake chars here */}
                <div className="w-12 h-12 flex items-center justify-center text-2xl border-l-2 border-white text-white cursor-pointer hover:text-white">📄</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl text-[#858585] cursor-pointer hover:text-white">🔍</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl text-[#858585] cursor-pointer hover:text-white">🌿</div>
                <div className="w-12 h-12 flex items-center justify-center text-2xl text-[#858585] cursor-pointer hover:text-white">🐞</div>

                <div className="mt-auto pb-2">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl text-[#858585] cursor-pointer hover:text-white">⚙️</div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="w-64 bg-[#252526] flex flex-col border-r border-[#000]">
                <div className="h-9 flex items-center px-4 text-[11px] font-bold text-[#bbbbbb] uppercase tracking-wide">
                    Explorer: Portfolio
                </div>

                {/* Tree View */}
                <div className="flex-1 overflow-y-auto">
                    <div className="py-1">
                        <div className="pl-2 flex items-center text-[#cccccc] font-bold cursor-pointer hover:bg-[#2a2d2e]">
                            <span className="mr-1">▼</span> RESUME-V1
                        </div>

                        {/* Folder: src */}
                        <div>
                            <div className="pl-6 flex items-center text-[#cccccc] cursor-pointer hover:bg-[#2a2d2e]">
                                <span className="mr-1">▼</span> src
                            </div>

                            {/* Files */}
                            <div className="pl-10 flex items-center text-[#d4d4d4] bg-[#37373d] cursor-pointer border-l-2 border-[#007acc]">
                                <span className="mr-2 text-[#e8ba3e]">JS</span> experience.js
                            </div>
                            <div className="pl-10 flex items-center text-[#d4d4d4] cursor-pointer hover:bg-[#2a2d2e]">
                                <span className="mr-2 text-[#589df6]">TS</span> skills.ts
                            </div>
                            <div className="pl-10 flex items-center text-[#d4d4d4] cursor-pointer hover:bg-[#2a2d2e]">
                                <span className="mr-2 text-[#e95420]">HTML</span> about.html
                            </div>
                            <div className="pl-10 flex items-center text-[#d4d4d4] cursor-pointer hover:bg-[#2a2d2e]">
                                <span className="mr-2 text-[#4d78cc]">CSS</span> contact.css
                            </div>
                        </div>

                        {/* Folder: package.json */}
                        <div className="pl-6 flex items-center text-[#d4d4d4] cursor-pointer hover:bg-[#2a2d2e]">
                            <span className="mr-2 text-[#c63d14]">{ }</span> package.json
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e]">

                {/* Tabs */}
                <div className="h-9 bg-[#2d2d2d] flex items-center overflow-x-auto no-scrollbar">
                    <div className="px-3 h-full flex items-center bg-[#1e1e1e] text-white border-t-2 border-[#007acc] pr-8 relative min-w-fit cursor-pointer">
                        <span className="mr-2 text-[#e8ba3e]">JS</span> experience.js
                        <span className="absolute right-2 text-xs hover:bg-[#333] rounded-sm px-1">×</span>
                    </div>
                    <div className="px-3 h-full flex items-center text-[#969696] hover:bg-[#2d2d2d] border-r border-[#252526] pr-8 relative min-w-fit cursor-pointer">
                        <span className="mr-2 text-[#589df6]">TS</span> skills.ts
                    </div>
                </div>

                {/* Breadcrumb */}
                <div className="h-6 flex items-center px-4 text-xs text-[#a9a9a9] bg-[#1e1e1e] border-b border-[#00000010]">
                    src &gt; experience.js &gt; ...
                </div>

                {/* Code/Content */}
                <div className="flex-1 p-4 font-mono overflow-auto leading-6">
                    <div className="flex">
                        <div className="text-[#858585] select-none text-right pr-4 w-10">
                            1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9<br />10<br />11<br />12<br />13<br />14<br />15
                        </div>
                        <div>
                            <span className="text-[#569cd6]">import</span> <span className="text-[#9cdcfe]">{`{ work }`}</span> <span className="text-[#569cd6]">from</span> <span className="text-[#ce9178]">'./life'</span>;<br />
                            <br />
                            <span className="text-[#569cd6]">class</span> <span className="text-[#4ec9b0]">Developer</span> <span className="text-[#569cd6]">extends</span> <span className="text-[#4ec9b0]">Human</span> {'{'}<br />
                            <span className="ml-4 text-[#569cd6]">constructor</span>() {'{'}<br />
                            <span className="ml-8 text-[#569cd6]">super</span>();<br />
                            <span className="ml-8 text-[#9cdcfe]">this</span>.<span className="text-[#9cdcfe]">passion</span> = <span className="text-[#ce9178]">'Building Scalable Systems'</span>;<br />
                            <span className="ml-4">{'}'}</span><br />
                            <br />
                            <span className="ml-4 text-[#dcdcaa]">getCurrentRole</span>() {'{'}<br />
                            <span className="ml-8 text-[#c586c0]">return</span> {'{'}<br />
                            <span className="ml-12 text-[#9cdcfe]">company</span>: <span className="text-[#ce9178]">'Tech Corp'</span>,<br />
                            <span className="ml-12 text-[#9cdcfe]">role</span>: <span className="text-[#ce9178]">'Senior Engineer'</span>,<br />
                            <span className="ml-12 text-[#9cdcfe]">impact</span>: [<br />
                            <span className="ml-16 text-[#ce9178]">'Reduced build times by 50%'</span>,<br />
                            <span className="ml-16 text-[#ce9178]">'Mentored 3 junior devs'</span><br />
                            <span className="ml-12">]</span><br />
                            <span className="ml-8">{'}'}</span>;<br />
                            <span className="ml-4">{'}'}</span><br />
                            {'}'}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs select-none">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">🚫 0 ⚠️ 0</span>
                    </div>
                    <div className="flex gap-4">
                        <span>Ln 12, Col 34</span>
                        <span>UTF-8</span>
                        <span>JavaScript</span>
                        <span className="hover:bg-[#ffffff20] p-0.5 rounded cursor-pointer">Prettier</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
