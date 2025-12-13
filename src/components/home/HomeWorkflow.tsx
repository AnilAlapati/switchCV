const WORKFLOW_STEPS = [
  {
    title: "Tell us about you",
    description:
      "Answer guided prompts or describe your experience in your own words.",
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
    description: "Publish a unique link and track when your resume is viewed.",
    accent: "from-rose-500/20 to-transparent",
  },
];

export function HomeWorkflow() {
  return (
    <section aria-labelledby="workflow-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-purple-700 font-semibold">
            Workflow
          </p>
          <h2 id="workflow-heading" className="text-3xl font-bold">
            Launch a tailored resume in three focused steps.
          </h2>
        </div>
        <p className="text-slate-800 font-medium max-w-xl leading-relaxed">
          SwitchCV adapts to however you work—start from a blank canvas or let
          AI guide you through a conversation to build your resume.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {WORKFLOW_STEPS.map((step, index) => (
          <article
            key={step.title}
            className={`rounded-3xl glass-panel bg-gradient-to-br ${step.accent} p-6 backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#1A2F25]/60">
                Step {index + 1}
              </span>
              <span className="w-9 h-9 rounded-2xl bg-[#2C4A3B]/10 flex items-center justify-center text-[#1A2F25]/80 font-bold">
                {index + 1}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#1A2F25] mb-2">
              {step.title}
            </h3>
            <p className="text-[#1A2F25]/70 text-sm leading-relaxed">
              {step.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
