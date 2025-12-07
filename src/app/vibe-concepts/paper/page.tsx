
import React from 'react';

export default function PaperPage() {
    return (
        <div className="min-h-screen bg-[#FFF8E1] font-sans selection:bg-[#FFB74D] selection:text-white">
            {/* Texture overlay could go here */}

            <nav className="p-8">
                <div className="flex justify-between items-center">
                    <div className="font-bold text-2xl text-[#5D4037] transform rotate-[-1deg]">PaperClip.</div>
                    <div className="hidden md:flex gap-4">
                        <button className="px-6 py-2 bg-white text-[#5D4037] font-medium shadow-[0px_4px_6px_rgba(0,0,0,0.1)] transform hover:-translate-y-1 transition-transform rotate-1">
                            Projects
                        </button>
                        <button className="px-6 py-2 bg-[#FF7043] text-white font-medium shadow-[0px_4px_6px_rgba(0,0,0,0.2)] transform hover:-translate-y-1 transition-transform rotate-[-2deg]">
                            Create New
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-12 gap-8">

                    {/* Main Sheet */}
                    <div className="md:col-span-8">
                        <div className="bg-white p-12 shadow-[0px_10px_20px_rgba(0,0,0,0.05),0px_2px_4px_rgba(0,0,0,0.05)] transform rotate-[0.5deg] relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-[#E57373] shadow-sm transform -translate-x-1/2"></div>

                            <h1 className="text-5xl font-bold text-[#3E2723] mb-6">Thoughts on <br /> Creativity.</h1>
                            <p className="text-lg text-[#5D4037] leading-relaxed mb-8">
                                Design doesn't have to feel digital. By mimicking physical properties—shadows, layers, and textures—we create interfaces that feel tactile and grounded.
                            </p>

                            <div className="flex gap-4 flex-wrap">
                                {['#Idea', '#Sketch', '#Prototype'].map((tag, i) => (
                                    <span key={tag} className="bg-[#FFECB3] text-[#795548] px-4 py-1.5 shadow-sm transform hover:scale-105 transition-transform" style={{ transform: `rotate(${i % 2 === 0 ? 2 : -2}deg)` }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Overlapping note */}
                        <div className="bg-[#B2DFDB] p-6 w-64 shadow-[0px_8px_16px_rgba(0,0,0,0.1)] transform rotate-[-4deg] -mt-12 ml-auto relative z-10">
                            <p className="handwriting font-medium text-[#004D40] text-lg">
                                "Don't forget to keep it simple!"
                            </p>
                            <div className="mt-4 text-xs text-[#00695C] text-right">- The Team</div>
                        </div>
                    </div>

                    {/* Sidebar Notes */}
                    <div className="md:col-span-4 space-y-8 mt-12 md:mt-0">
                        <div className="bg-[#FFCDD2] p-6 shadow-md transform rotate-2 hover:rotate-0 transition-transform duration-300">
                            <h3 className="font-bold text-[#C62828] text-lg mb-2">To-Do List</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-[#E57373] bg-white"></div>
                                    <span className="text-[#B71C1C] line-through opacity-60">Brainstorming</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-[#E57373] bg-white"></div>
                                    <span className="text-[#C62828]">Sketch wireframes</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-[#E57373] bg-white"></div>
                                    <span className="text-[#C62828]">Choose palette</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-[#E1BEE7] p-6 shadow-md transform rotate-[-3deg] hover:rotate-[-1deg] transition-transform duration-300">
                            <h3 className="font-bold text-[#6A1B9A] text-lg mb-2">Inspiration</h3>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="aspect-square bg-[#F3E5F5] border-4 border-white shadow-sm"></div>
                                <div className="aspect-square bg-[#AB47BC] border-4 border-white shadow-sm"></div>
                                <div className="aspect-square bg-[#8E24AA] border-4 border-white shadow-sm"></div>
                                <div className="aspect-square bg-[#F3E5F5] border-4 border-white shadow-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
