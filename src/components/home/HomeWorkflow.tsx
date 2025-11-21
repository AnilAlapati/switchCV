const WORKFLOW_STEPS = [
  {
    title: "Tell us about you",
    description:
      "Import LinkedIn or answer guided prompts tailored for modern roles.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Let AI refine",
    description:
      "Polish each bullet with AI feedback focused on clarity, metrics, and tone.",
    accent: "from-purple-500/20 to-transparent",
  },
  {
    title: "Share securely",
    description:
      "Publish a unique link with privacy rules and know exactly when it is viewed.",
    accent: "from-rose-500/20 to-transparent",
  },
];

export function HomeWorkflow() {
  return (
    <section aria-labelledby="workflow-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
            Workflow
          </p>
          <h2 id="workflow-heading" className="text-3xl font-bold">
            Launch a tailored resume in three focused steps.
          </h2>
        </div>
        <p className="text-slate-300 max-w-xl">
          SwitchCV adapts to however you work—start from a blank canvas, import
          an existing resume, or let AI interview you for the details.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {WORKFLOW_STEPS.map((step, index) => (
          <article
            key={step.title}
            className={`rounded-3xl border border-white/10 bg-gradient-to-br ${step.accent} p-6 backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-300">Step {index + 1}</span>
              <span className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-white/80">
                {index + 1}
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
            <p className="text-slate-200 text-sm leading-relaxed">
              {step.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
