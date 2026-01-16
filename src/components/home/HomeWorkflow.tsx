import { motion } from "framer-motion";

const WORKFLOW_STEPS = [
  {
    title: "Tell us about you",
    description:
      "Answer guided prompts or describe your experience in your own words.",
    accent: "from-cyan-500/20 to-transparent",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    title: "Let AI refine",
    description:
      "Polish each bullet with AI feedback focused on clarity, metrics, and tone.",
    accent: "from-purple-500/20 to-transparent",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: "Share securely",
    description: "Publish a unique link and track when your resume is viewed.",
    accent: "from-rose-500/20 to-transparent",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    )
  },
];

export function HomeWorkflow() {
  return (
    <section id="how-it-works" aria-labelledby="workflow-heading" className="space-y-12 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
      >
        <div className="space-y-4">
          <p className="inline-block text-[10px] uppercase tracking-[0.4em] text-[#2C4A3B] font-bold bg-[#4ADE80]/10 px-3 py-1 rounded-full">
            The Process
          </p>
          <h2 id="workflow-heading" className="text-4xl font-bold text-[#1A2F25] tracking-tight">
            Launch a tailored resume <br /> in three focused steps.
          </h2>
        </div>
        <p className="text-slate-600 font-medium max-w-md leading-relaxed">
          SwitchCV adapts to however you work—start from a blank canvas or let
          AI guide you through a conversation to build your resume.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3 relative">
        {/* Connection line for desktop */}
        <div className="hidden md:block absolute top-[2.75rem] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-rose-500/20 z-0" />

        {WORKFLOW_STEPS.map((step, index) => (
          <motion.article
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            className="group relative"
          >
            <div className={`h-full rounded-[2rem] glass-panel-deep bg-gradient-to-br ${step.accent} p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 z-10 relative overflow-hidden`}>
              {/* Background Glow */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />

              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[#1A2F25] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  {step.icon}
                </div>
                <span className="text-[10px] font-black text-[#1A2F25]/20 uppercase tracking-tighter">
                  Phase 0{index + 1}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#1A2F25] mb-3 tracking-tight">
                {step.title}
              </h3>
              <p className="text-[#1A2F25]/70 text-sm leading-relaxed mb-6">
                {step.description}
              </p>

              <div className="flex items-center gap-2 text-[10px] font-bold text-[#2C4A3B] mt-auto">
                <span className="w-6 h-[1px] bg-[#2C4A3B]/30" />
                GET STARTED
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
