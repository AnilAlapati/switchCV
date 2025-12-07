
import Link from 'next/link';

export default function VibeConceptsIndex() {
    const concepts = [
        // Original 5
        { name: 'Nordic Clean', path: 'nordic', desc: 'Cool, crisp, minimal, professional', category: 'Clean' },
        { name: 'Warm Sand', path: 'warm', desc: 'Soft beige, organic, inviting', category: 'Warm' },
        { name: 'Neo-Brutalism Lite', path: 'neo', desc: 'Bold, structured, high contrast light', category: 'Bold' },
        { name: 'Glass & Nature', path: 'glass', desc: 'Frosted glass, soft greens, botanical', category: 'Nature' },
        { name: 'Modern Indigo', path: 'indigo', desc: 'Vibrant blue accents, white background', category: 'Tech' },

        // Round 2 (Creative)
        { name: 'Cyberpunk Neon', path: 'cyberpunk', desc: 'Dark, glitch effects, neon pink/cyan', category: 'Dark' },
        { name: 'Retro 90s OS', path: 'retro', desc: 'Windows 95 style, bevels, pixel fonts', category: 'Nostalgia' },
        { name: 'Paper Craft', path: 'paper', desc: 'Layered physical paper look, realistic shadows', category: 'Material' },
        { name: 'Monochrome Luxury', path: 'luxury', desc: 'High fashion, sharp serif, black & white', category: 'Premium' },
        { name: 'Sunset Gradient', path: 'sunset', desc: 'Warm blurs, mesh gradients, emotional', category: 'Color' },
        { name: 'Terminal/Hacker', path: 'terminal', desc: 'Monospace, green on black, raw code', category: 'Tech' },
        { name: 'Magazine Editorial', path: 'editorial', desc: 'Big typography, grid lines, bold layout', category: 'Print' },
        { name: 'Claymorphism', path: 'clay', desc: 'Soft 3D, puffy shapes, playful', category: '3D' },
        { name: 'Bauhaus', path: 'bauhaus', desc: 'Geometric primitives, primary colors', category: 'Art' },
        { name: 'Deep Space', path: 'space', desc: 'Cosmic, glowing stars, deep blues', category: 'Dark' },

        // Round 3 (Functional UX)
        { name: 'Swipe & Match', path: 'swipe', desc: 'Tinder-style job discovery', category: 'UX' },
        { name: 'Skill Tree', path: 'skill-tree', desc: 'RPG-style career progression visualization', category: 'Gamification' },
        { name: 'Talent Ticker', path: 'ticker', desc: 'Stock market style career value tracking', category: 'Data' },
        { name: 'Timeline Story', path: 'timeline', desc: 'Horizontal scrolling life story', category: 'Storytelling' },
        { name: 'Kanban Tracker', path: 'kanban', desc: 'Drag & drop application management', category: 'Productivity' },
        { name: 'IDE Portfolio', path: 'ide', desc: 'VS Code style resume for developers', category: 'Dev' },
        { name: 'Masonry Grid', path: 'masonry', desc: 'Pinterest style visual portfolio', category: 'Visual' },
        { name: 'Conversational', path: 'chat-build', desc: 'Chat-based resume builder', category: 'AI' },
        { name: 'Zen Writer', path: 'zen', desc: 'Distraction-free focus mode', category: 'Writing' },
        { name: 'Recruiter HUD', path: 'hud', desc: 'Iron Man style high-density dashboard', category: 'Data' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4">Design Vibe Concepts</h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        25 unique, isolated UI experiments. Exploring aesthetics and functional UX patterns for the next generation of resumes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {concepts.map((concept) => (
                        <Link
                            key={concept.path}
                            href={`/vibe-concepts/${concept.path}`}
                            className="group relative bg-white rounded-2xl p-8 hover:-translate-y-1 transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded transition-colors ${['UX', 'Gamification', 'Data', 'Storytelling', 'Productivity', 'Dev', 'Visual', 'AI', 'Writing'].includes(concept.category)
                                        ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-900 group-hover:text-white'
                                    }`}>
                                    {concept.category}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {concept.name}
                            </h2>
                            <p className="text-gray-500 leading-relaxed">{concept.desc}</p>

                            <div className="mt-6 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                View Concept <span className="ml-1">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
