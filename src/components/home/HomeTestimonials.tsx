const TESTIMONIALS = [
  {
    quote:
      "SwitchCV helped me turn a messy Google Doc into a resume that actually tells my story.",
    author: "Avery K.",
    role: "Sr. Product Designer",
  },
  {
    quote:
      "Sharing a private link with recruiters means I can update details even after I hit send.",
    author: "Jordan P.",
    role: "Staff Engineer",
  },
  {
    quote:
      "The AI critiques feel like a career coach in the loop—concise, actionable, and spot on.",
    author: "Mina L.",
    role: "Growth PM",
  },
];

export function HomeTestimonials() {
  return (
    <section aria-labelledby="voices-heading" className="space-y-8">
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
          Voices from the community
        </p>
        <h2 id="voices-heading" className="text-3xl font-bold">
          Crafted with real candidates in mind.
        </h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <blockquote
            key={testimonial.author}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-xl shadow-black/30"
          >
            <p className="text-slate-200 text-lg leading-relaxed">
              “{testimonial.quote}”
            </p>
            <footer className="mt-6">
              <p className="text-white font-semibold">{testimonial.author}</p>
              <p className="text-sm text-slate-400">{testimonial.role}</p>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
