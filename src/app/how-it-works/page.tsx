"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Brain, Zap, ArrowRight, Sparkles, Target, Users } from "lucide-react";

const agents = [
    {
        id: "research",
        name: "Research Agent",
        nickname: "The Scout",
        modelFree: "gemini-2.5-flash-lite",
        modelPremium: "gemini-2.5-flash",
        icon: Target,
        color: "purple",
        description: "The reconnaissance agent that digs deep into company culture, core values, and industry trends to find the requirements hidden between the lines of a job post.",
        whatItDoes: [
            "Analyzes company mission and values",
            "Researches industry-specific trends",
            "Identifies cultural fit indicators"
        ]
    },
    {
        id: "planning",
        name: "Planning Agent",
        nickname: "The Strategist",
        modelFree: "gemini-2.5-flash-lite",
        modelPremium: "gemini-2.5-flash",
        icon: Brain,
        color: "blue",
        description: "The strategic brain that synthesizes research data and job requirements to create a personalized multi-point roadmap for your resume.",
        whatItDoes: [
            "Reads and understands the job requirements",
            "Identifies gaps between your resume and the target role",
            "Creates a tailored strategy to maximize your match"
        ]
    },
    {
        id: "execution",
        name: "Execution Agent",
        nickname: "The Writer",
        modelFree: "gemini-2.5-flash-lite",
        modelPremium: "gemini-2.5-flash",
        icon: Zap,
        color: "amber",
        description: "The high-speed writer that rewrites your resume content following the strategic plan, transforming generic statements into powerful achievements.",
        whatItDoes: [
            "Rewrites experience with action-driven language",
            "Quantifies achievements with metrics where possible",
            "Optimizes keywords for ATS compatibility"
        ]
    },
    {
        id: "validation",
        name: "Validation Agent",
        nickname: "The Auditor",
        modelFree: "gemini-2.5-flash-lite",
        modelPremium: "gemini-2.5-flash",
        icon: Sparkles,
        color: "green",
        description: "The quality control agent that fact-checks the execution against the original requirements and strategic plan, ensuring zero hallucinations.",
        whatItDoes: [
            "Verifies ATS score improvement",
            "Ensures all strategic goals were met",
            "Prevents AI hallucinations"
        ]
    },
    {
        id: "polish",
        name: "Polish Agent",
        nickname: "The Editor",
        modelFree: "gemini-2.5-flash-lite",
        modelPremium: "gemini-2.5-flash",
        icon: Users,
        color: "rose",
        description: "The final editor that refines tone, brevity, and punchiness. It ensures your resume sounds professional, human, and impactful.",
        whatItDoes: [
            "Refines tone and professional flow",
            "Optimizes for maximum brevity",
            "Ensures a consistent 'active' voice"
        ]
    }
];

const beforeAfterExamples = [
    {
        category: "Experience Statement",
        before: "Worked on various projects and helped the team",
        after: "Led 3 cross-functional teams to deliver a design system adopted by 1M+ users, reducing development time by 40%",
        improvement: "Vague → Specific with impact metrics"
    },
    {
        category: "Technical Skills",
        before: "Good at Python and some machine learning stuff",
        after: "Built production ML pipelines processing 10M+ daily predictions using Python, TensorFlow, and AWS SageMaker",
        improvement: "Casual → Professional with scale"
    },
    {
        category: "Leadership",
        before: "Managed a few people",
        after: "Scaled engineering team from 4 to 12 engineers across 3 time zones while maintaining 95% retention rate",
        improvement: "Generic → Quantified growth story"
    }
];

export default function HowItWorksPage() {
    return (
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-black/10 py-4 px-6 md:px-12">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                    <Link
                        href="/auth?mode=signup"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        Try it Free →
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-16 md:py-24 px-6 md:px-12">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mb-4 block"
                    >
                        Under the Hood
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-black mb-6"
                    >
                        How Our AI Agents Work
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-600 font-light max-w-2xl mx-auto"
                    >
                        Five specialized AI agents collaborate to transform your resume—researching, strategizing, writing, validating, and polishing. Together, they produce results no single AI can match.
                    </motion.p>
                </div>
            </section>

            {/* Flow Diagram */}
            <section className="py-8 px-6 md:px-12 border-y border-black/10 bg-[#F5F5F0]">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                        <FlowStep label="Your Resume" sublabel="+ Job Description" icon={<Target className="w-4 h-4" />} isFirst />
                        <FlowArrow />
                        <FlowStep label="Research" sublabel="Context" color="purple" icon={<Target className="w-4 h-4" />} />
                        <FlowArrow />
                        <FlowStep label="Planning" sublabel="Strategy" color="blue" icon={<Brain className="w-4 h-4" />} />
                        <FlowArrow />
                        <FlowStep label="Execution" sublabel="Rewriting" color="amber" icon={<Zap className="w-4 h-4" />} />
                        <FlowArrow />
                        <FlowStep label="Validation" sublabel="Auditing" color="green" icon={<Sparkles className="w-4 h-4" />} />
                        <FlowArrow />
                        <FlowStep label="Polish" sublabel="Editing" color="rose" icon={<Users className="w-4 h-4" />} />
                        <FlowArrow />
                        <FlowStep label="Enhanced Resume" sublabel="Interview Ready" icon={<Sparkles className="w-4 h-4" />} isLast />
                    </div>
                </div>
            </section>

            {/* Before/After Section - THE KEY SELLING POINT */}
            <section className="py-16 md:py-24 px-6 md:px-12 bg-gradient-to-b from-white to-blue-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                            See the Difference
                        </h2>
                        <p className="text-gray-600 max-w-xl mx-auto">
                            Real examples of how our agents transform vague statements into compelling, quantified achievements.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {beforeAfterExamples.map((example, index) => (
                            <motion.div
                                key={example.category}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-sm"
                            >
                                <div className="px-6 py-3 bg-gray-50 border-b border-black/5">
                                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                                        {example.category}
                                    </span>
                                </div>
                                <div className="p-6 grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">BEFORE</span>
                                        <p className="text-gray-500 line-through italic">&quot;{example.before}&quot;</p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">AFTER</span>
                                        <p className="text-black font-medium">&quot;{example.after}&quot;</p>
                                    </div>
                                </div>
                                <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                                    <span className="text-sm text-blue-700 font-medium flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        {example.improvement}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Agent Cards */}
            <section className="py-16 md:py-24 px-6 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                            Meet Your AI Team
                        </h2>
                        <p className="text-gray-600 max-w-xl mx-auto">
                            Each agent specializes in a specific task. Together, they deliver results that surpass any single-shot AI.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {agents.map((agent, index) => (
                            <AgentCard key={agent.id} agent={agent} delay={index * 0.1} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Model Selection Explainer */}
            <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0] border-y border-black/10">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                            Smart Model Selection
                        </h2>
                        <p className="text-gray-600 max-w-xl mx-auto">
                            We use the right model for each task—powerful reasoning for strategy, high-speed execution for writing.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-black/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className="font-bold text-lg">Free Tier</span>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3">
                                    <Brain className="w-4 h-4 text-blue-600" />
                                    <span><strong>All 5 Agents:</strong> Gemini 2.5 Flash Lite</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Fast</span>
                                </li>
                            </ul>
                            <p className="text-xs text-gray-500 mt-4">5 free agent runs included</p>
                        </div>
                        <div className="bg-black text-white p-6 rounded-xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-lg">Premium Tier</span>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3">
                                    <Brain className="w-4 h-4 text-blue-400" />
                                    <span><strong>All 5 Agents:</strong> Gemini 2.5 Flash</span>
                                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">Smart</span>
                                </li>
                            </ul>
                            <p className="text-xs text-gray-400 mt-4">Unlimited runs + priority processing</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Multi-Agent */}
            <section className="py-16 md:py-24 px-6 md:px-12 bg-black text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                        Why Five Agents Beat One
                    </h2>
                    <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
                        Single-shot AI often produces generic results. Our specialized 5-agent team works like a professional career firm—each focused on what they do best.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                        <div className="p-6 border border-white/20 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">🧠 Smarter Strategy</h3>
                            <p className="text-sm text-gray-400">The Planning Agent uses Gemini 2.5 to deeply understand the job requirements before any writing begins.</p>
                        </div>
                        <div className="p-6 border border-white/20 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">⚡ Faster Execution</h3>
                            <p className="text-sm text-gray-400">The Execution Agent follows a clear plan, producing focused results without wandering off-track.</p>
                        </div>
                        <div className="p-6 border border-white/20 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">🎯 Better Results</h3>
                            <p className="text-sm text-gray-400">Multi-stage processing catches opportunities a single pass would miss. Research + Strategy + Execution = Interview-ready.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 md:py-24 px-6 md:px-12">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-serif font-bold mb-6">
                        Ready to Transform Your Resume?
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Your first 5 AI agent runs are free. See the difference for yourself.
                    </p>
                    <Link
                        href="/auth?mode=signup"
                        className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-medium text-lg hover:bg-gray-800 transition-colors"
                    >
                        Generate Your Resume
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/10 py-8 px-6 md:px-12">
                <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
                    © {new Date().getFullYear()} SwitchCV. All rights reserved.
                </div>
            </footer>
        </main>
    );
}

function AgentCard({ agent, delay }: { agent: typeof agents[0]; delay: number }) {
    const Icon = agent.icon;
    const colorClasses = {
        blue: "bg-blue-100 text-blue-600 border-blue-200",
        amber: "bg-amber-100 text-amber-600 border-amber-200",
        purple: "bg-purple-100 text-purple-600 border-purple-200",
        green: "bg-green-100 text-green-600 border-green-200",
        rose: "bg-rose-100 text-rose-600 border-rose-200",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + delay }}
            className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClasses[agent.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {agent.modelFree}
                </span>
            </div>
            <h3 className="font-serif font-bold text-xl mb-1">{agent.name}</h3>
            <span className="text-sm text-blue-600 font-medium block mb-3">{agent.nickname}</span>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{agent.description}</p>
            <div className="border-t border-black/5 pt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">What it does</span>
                <ul className="space-y-2">
                    {agent.whatItDoes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
}

function FlowStep({ label, sublabel, color, isFirst, isLast, icon }: { label: string; sublabel: string; color?: string; isFirst?: boolean; isLast?: boolean; icon?: React.ReactNode }) {
    const bgClass = isFirst || isLast
        ? "bg-black text-white"
        : color === "blue"
            ? "bg-blue-600 text-white"
            : color === "amber"
                ? "bg-amber-500 text-white"
                : color === "rose"
                    ? "bg-rose-500 text-white"
                    : color === "green"
                        ? "bg-green-600 text-white"
                        : color === "purple"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-200 text-black";

    return (
        <div className="text-center">
            <div className={`px-4 py-2.5 rounded-lg font-medium text-sm ${bgClass} flex items-center gap-2 justify-center`}>
                {icon}
                {label}
            </div>
            <span className="text-xs text-gray-500 mt-1 block">{sublabel}</span>
        </div>
    );
}

function FlowArrow() {
    return (
        <>
            <div className="text-gray-400 hidden md:block">
                <ArrowRight className="w-5 h-5" />
            </div>
            <div className="text-gray-400 md:hidden">
                <ArrowRight className="w-5 h-5 rotate-90" />
            </div>
        </>
    );
}
