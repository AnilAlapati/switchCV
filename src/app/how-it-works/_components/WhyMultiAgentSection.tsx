import type { UserMode } from "../types";

export function WhyMultiAgentSection({ mode }: { mode: UserMode }) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-black text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
          {mode === "jobseeker" ? "Why 4 Agents Beat One" : "Why AI-Powered Recruiting Wins"}
        </h2>
        <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
          {mode === "jobseeker"
            ? "Single-shot AI often produces generic results. Our specialized 4-agent team works like a professional career firm-collaborating to ensure perfection at every stage."
            : "Manual recruiting is slow and inconsistent. Our 2-agent system works like having a full recruiting team-available 24/7 and getting smarter every day."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {mode === "jobseeker" ? (
            <>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">🧠 Deeper Strategy</h3>
                <p className="text-sm text-gray-400">
                  The Scout and Architect work together to deeply understand
                  requirements before a single word is written.
                </p>
              </div>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">⚡ Unified Writing</h3>
                <p className="text-sm text-gray-400">
                  The Writer combines storytelling and editing in one
                  high-impact pass, ensuring perfect flow and professional
                  impact.
                </p>
              </div>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">🎯 Zero Hallucinations</h3>
                <p className="text-sm text-gray-400">
                  The Auditor performs a rigorous final check and selects the
                  ideal design to make your resume stand out to recruiters.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">🔍 Faster Sourcing</h3>
                <p className="text-sm text-gray-400">
                  The Discovery Agent finds qualified candidates in seconds, not
                  hours. Semantic search understands context, not just keywords.
                </p>
              </div>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">💬 Better Response Rates</h3>
                <p className="text-sm text-gray-400">
                  The Outreach Agent writes messages that get replies.
                  Personalized at scale means 3x higher engagement.
                </p>
              </div>
              <div className="p-6 border border-white/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">📊 Data-Driven Decisions</h3>
                <p className="text-sm text-gray-400">
                  Match Analysis provides objective scoring. No more gut
                  feelings-just data-backed hiring decisions.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
