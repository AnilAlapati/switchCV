import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    quote:
      "Finally, a resume builder that doesn't feel like filling out a tax form. The AI actually gets it.",
    author: "Beta Tester #1",
    role: "🧪 Early Adopter",
  },
  {
    quote:
      "I've been looking for something like this. Simple, clean, and the AI suggestions are surprisingly good.",
    author: "Beta Tester #2",
    role: "🚀 First 100 Club",
  },
  {
    quote:
      "Built my resume in one coffee break. Now I'm just waiting for you all to catch up.",
    author: "Beta Tester #3",
    role: "☕ Launch Day Crew",
  },
];

export function HomeTestimonials() {
  return (
    <section id="testimonials" aria-labelledby="voices-heading" className="space-y-12 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <p className="inline-block text-[10px] uppercase tracking-[0.4em] text-rose-700 font-bold bg-rose-100/50 px-3 py-1 rounded-full">
          Voices from Beta
        </p>
        <h2 id="voices-heading" className="text-4xl sm:text-5xl font-bold text-[#1A2F25] tracking-tight">
          Be among the first to try it.
        </h2>
      </motion.div>
      <div className="grid gap-8 lg:grid-cols-3">
        {TESTIMONIALS.map((testimonial, index) => (
          <motion.blockquote
            key={testimonial.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ y: -5 }}
            className="glass-panel-deep p-8 shadow-xl hover:shadow-2xl transition-all duration-300 relative rounded-[2rem] overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-colors" />

            <div className="text-4xl text-rose-200 mb-6 font-serif">&ldquo;</div>
            <p className="text-[#1A2F25]/80 text-lg leading-relaxed font-medium relative z-10">
              {testimonial.quote}&rdquo;
            </p>
            <footer className="mt-8 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all duration-300">
                {testimonial.role.split(' ')[0]}
              </div>
              <div>
                <p className="text-[#1A2F25] font-bold text-sm tracking-tight">{testimonial.author}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{testimonial.role.split(' ').slice(1).join(' ')}</p>
              </div>
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
}
