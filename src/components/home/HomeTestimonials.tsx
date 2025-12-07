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
    <section aria-labelledby="voices-heading" className="space-y-8">
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
          From our beta testers
        </p>
        <h2 id="voices-heading" className="text-3xl font-bold">
          Be among the first to try it.
        </h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <blockquote
            key={testimonial.author}
            className="glass-panel p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <p className="text-[#1A2F25]/80 text-lg leading-relaxed">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <footer className="mt-6">
              <p className="text-[#1A2F25] font-bold">{testimonial.author}</p>
              <p className="text-sm text-[#2C4A3B]/60 font-medium">{testimonial.role}</p>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
