
import React from 'react';

export default function ChatBuildPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">

            {/* Header */}
            <header className="border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        AI
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">Resume Assistant</h1>
                        <p className="text-xs text-green-500 font-medium">● Online</p>
                    </div>
                </div>
                <button className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                    Export PDF
                </button>
            </header>

            {/* Chat Area */}
            <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 pb-32">

                {/* Bot Message */}
                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0"></div>
                    <div className="space-y-2 max-w-[80%]">
                        <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none text-gray-800 leading-relaxed">
                            Hi! let's build your resume. To start, tell me about your most recent role. What was your job title and company?
                        </div>
                        <span className="text-xs text-gray-400 ml-2">10:00 AM</span>
                    </div>
                </div>

                {/* User Message */}
                <div className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div className="space-y-2 max-w-[80%]">
                        <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none text-white leading-relaxed text-right">
                            I was a Senior Software Engineer at TechFlow Inc.
                        </div>
                        <span className="text-xs text-gray-400 mr-2 text-right block">10:01 AM</span>
                    </div>
                </div>

                {/* Bot Message - Analysis */}
                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 animate-pulse"></div>
                    <div className="space-y-2 max-w-[80%]">
                        <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none text-gray-800 leading-relaxed">
                            Great! TechFlow is known for high-scale systems. <br /><br />
                            I've drafted a bullet point for you based on typical roles there. How does this look?
                        </div>

                        {/* Card Insert */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Draft Bullet</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Edit</button>
                                    <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Approve</button>
                                </div>
                            </div>
                            <p className="text-gray-700 font-medium">
                                "Architected and deployed a microservices-based payment gateway handling $5M+ in daily transaction volume, reducing latency by 40%."
                            </p>
                        </div>

                        <span className="text-xs text-gray-400 ml-2">10:02 AM</span>
                    </div>
                </div>

                {/* User Message */}
                <div className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div className="space-y-2 max-w-[80%]">
                        <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none text-white leading-relaxed text-right">
                            That looks perfect!
                        </div>
                    </div>
                </div>

            </main>

            {/* Input Area */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        📎
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="w-full bg-transparent outline-none py-3 text-gray-700"
                        />
                    </div>
                    <button className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                        <span className="transform rotate-90 block">➤</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
