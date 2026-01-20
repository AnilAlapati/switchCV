import { motion } from "motion/react";

const FEATURE_CARDS = [
    {
        title: "Privacy",
        subtitle: "Chapter I",
        description: "Your data is yours. Share securely with expiring links and granular access controls.",
    },
    {
        title: "Intelligence",
        subtitle: "Chapter II",
        description: "Our agents analyze market trends to shape your profile for maximum impact.",
    },
    {
        title: "Tracking",
        subtitle: "Chapter III",
        description: "Know exactly when your story is being read by recruiters and hiring managers.",
    },
    {
        title: "Discovery",
        subtitle: "Epilogue",
        description: "Let the right opportunities find you through reverse-search matching.",
    },
];

export function WriterFeatureCards() {
    return (
        <section id="features" className="space-y-20 py-24 relative z-10 border-t border-black text-black">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-left"
            >
                <h2 className="text-6xl font-serif font-bold tracking-tighter mb-6">
                    The Process
                </h2>
                <p className="text-xl font-sans text-gray-600 max-w-2xl leading-relaxed border-l border-black pl-6 ml-2">
                    Building a career is a story of evolution. We provide the tools to edit, refine, and publish your best version. You get a permanent shareable link for your resume.
                </p>
            </motion.div>

            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
                {FEATURE_CARDS.map((card, index) => (
                    <motion.article
                        key={card.title}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.8 }}
                        className="group relative"
                    >
                        <div className="border-t-2 border-black pt-4 mb-4">
                            <span className="font-mono text-xs uppercase tracking-widest text-gray-400">{card.subtitle}</span>
                        </div>

                        <h3 className="text-3xl font-serif font-bold mb-4 group-hover:text-blue-600 transition-colors duration-300">
                            {card.title}.
                        </h3>

                        <p className="font-serif text-lg text-gray-800 leading-relaxed">
                            {card.description}
                        </p>


                    </motion.article>
                ))}
            </div>
        </section>
    );
}
