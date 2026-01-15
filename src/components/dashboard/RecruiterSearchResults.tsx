/* eslint-disable max-lines */
import { type ReactNode, useState } from "react";
import { SearchResult, SearchModeType } from "./RecruiterSearchForm";
import { AgentMessageModal } from "@/components/recruiter/AgentMessageModal";

interface RecruiterSearchResultsProps {
  results: SearchResult[];
  searched: boolean;
  error: string | null;
  notification: string | null;
  searchMode: SearchModeType;
  onViewResume: (resumeId: string) => void;
  onRequestAccess?: (resumeId: string, userName: string) => void;
  // TODO: Pass in current user context/job context if available, or fetch from props
  jobContext?: { title: string; description?: string };
}

const badgeStyles: Record<
  NonNullable<SearchResult["accessStatus"]>,
  { label: string; classes: string; helper: string }
> = {
  approved: {
    label: "Approved",
    classes:
      "bg-emerald-50 text-emerald-900 border-2 border-black",
    helper: "Full resume unlocked and ready to view",
  },
  pending: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-900 border-2 border-black",
    helper: "You'll be notified when the candidate responds",
  },
  denied: {
    label: "Denied",
    classes: "bg-rose-50 text-rose-900 border-2 border-black",
    helper: "Consider personalizing your request and trying again",
  },
  none: {
    label: "Request Access",
    classes: "bg-white text-slate-900 border-2 border-black",
    helper: "Send a personalized request to view full contact details",
  },
};

const Callout = ({
  variant,
  children,
}: {
  variant: "error" | "info";
  children: ReactNode;
}) => (
  <section className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 rounded-lg">
    <div
      className={`flex items-center gap-3 rounded-lg border-2 border-black px-5 py-4 font-bold ${variant === "error"
          ? "bg-rose-50 text-rose-900"
          : "bg-cyan-50 text-cyan-900"
        }`}
    >
      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${variant === "error" ? "bg-rose-200" : "bg-cyan-200"}`}>
        {variant === "error" ? "!" : "i"}
      </span>
      {children}
    </div>
  </section>
);

export function RecruiterSearchResults({
  results,
  searched,
  error,
  notification,
  searchMode,
  onViewResume,
  onRequestAccess,
  jobContext = {
    title: "Software Engineer",
    description:
      "Looking for a skilled developer with React and Node.js experience.",
  },
}: RecruiterSearchResultsProps) {
  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [analyzingFor, setAnalyzingFor] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, string>>(
    {}
  );
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  const handleDraftMessage = async (result: SearchResult) => {
    try {
      setIsAgentLoading(true);
      setDraftingFor(result.resumeId);

      const response = await fetch("/api/recruiter/agent/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            name: result.userName,
            title: result.title,
            skills: result.skills,
            experience: result.summary,
          },
          job: jobContext,
          recruiter: { recruiterName: "Hiring Team" }, // This should come from auth/user context
        }),
      });

      const data = await response.json();
      if (data.message) {
        setGeneratedMessage(data.message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Agent failed", err);
      // Optional: Show toast error
    } finally {
      setIsAgentLoading(false);
    }
  };

  const handleAnalyzeMatch = async (result: SearchResult) => {
    // Toggle off if already showing
    if (analysisResult[result.resumeId]) {
      setAnalysisResult((prev) => {
        const next = { ...prev };
        delete next[result.resumeId];
        return next;
      });
      return;
    }

    try {
      setAnalyzingFor(result.resumeId);
      const response = await fetch("/api/recruiter/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            title: result.title,
            skills: result.skills,
            experience: result.summary,
          },
          job: jobContext,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysisResult((prev) => ({
          ...prev,
          [result.resumeId]: data.analysis,
        }));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Analysis failed", err);
    } finally {
      setAnalyzingFor(null);
    }
  };

  if (error) {
    return <Callout variant="error">{error}</Callout>;
  }

  if (notification) {
    return <Callout variant="info">{notification}</Callout>;
  }

  const hasResults = searched && results.length > 0;

  if (hasResults) {
    return (
      <section className="space-y-5">
        {generatedMessage && (
          <AgentMessageModal
            message={generatedMessage}
            onClose={() => {
              setGeneratedMessage(null);
              setDraftingFor(null);
            }}
          />
        )}

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 rounded-xl px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full border border-black bg-emerald-500"></span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Search Complete
              </p>
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-serif">
              {results.length} resume{results.length === 1 ? "" : "s"} found
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 font-medium">
            ✨ Agent actions enabled for all results
          </p>
        </div>

        <div className="space-y-4">
          {results.map((result) => {
            const status = result.accessStatus ?? "none";
            const badge = badgeStyles[status];
            const created = new Date(result.createdAt).toLocaleDateString();
            const analysis = analysisResult[result.resumeId];
            const isAnalyzing = analyzingFor === result.resumeId;
            const isDrafting = draftingFor === result.resumeId;

            const actionArea = () => {
              if (status === "approved") {
                return (
                  <button
                    onClick={() => onViewResume(result.resumeId)}
                    className="group relative w-full overflow-hidden rounded-lg bg-black px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View Full Resume
                    </span>
                  </button>
                );
              }
              if (status === "pending") {
                return (
                  <button
                    disabled
                    className="w-full rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Request Pending
                    </span>
                  </button>
                );
              }
              if (status === "denied") {
                return (
                  <button
                    onClick={() =>
                      onRequestAccess?.(result.resumeId, result.userName)
                    }
                    className="group w-full rounded-lg border-2 border-rose-900 bg-white px-4 py-3 text-sm font-bold text-rose-900 transition-all hover:bg-rose-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Request Again
                    </span>
                  </button>
                );
              }
              return (
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      onRequestAccess?.(result.resumeId, result.userName)
                    }
                    className="group relative w-full overflow-hidden rounded-lg bg-black px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Request Access
                    </span>
                  </button>

                  {/* AGENT ACTIONS */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDraftMessage(result)}
                      disabled={isDrafting || isAgentLoading}
                      className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                      {isDrafting ? "Drafting..." : "✨ Draft Msg"}
                    </button>
                    <button
                      onClick={() => handleAnalyzeMatch(result)}
                      disabled={isAnalyzing}
                      className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? "Thinking..." : "🧠 Analyze"}
                    </button>
                  </div>
                </div>
              );
            };

            return (
              <article
                key={result.resumeId}
                className="group bg-white rounded-xl border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <svg
                          className="h-7 w-7 text-slate-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold font-serif text-slate-900">
                          {result.title}
                        </h4>
                        <p className="text-sm text-slate-600 font-medium font-sans">
                          {result.userName}
                        </p>
                      </div>
                      <span className="rounded-full border-2 border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                        #{result.userId.substring(0, 8)}
                      </span>
                    </div>

                    {result.skills && result.skills.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-[black]/50 font-bold">
                          Core skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.skills.map((skill, idx) => (
                            <span
                              key={`${result.resumeId}-skill-${idx}`}
                              className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ANALYSIS RESULT AREA */}
                    {analysis && (
                      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-indigo-600">🧠</span>
                          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                            AI Analysis
                          </span>
                        </div>
                        <div className="prose prose-sm prose-indigo max-w-none text-sm text-indigo-900/80">
                          {/* Simple markdown rendering */}
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {analysis}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-[black]/60 font-medium">
                      {result.location && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/50 px-3 py-1">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 11c-3 0-5 2.239-5 5v2h10v-2c0-2.761-2-5-5-5z"
                            />
                          </svg>
                          {result.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/50 px-3 py-1">
                        Posted {created}
                      </span>
                    </div>
                  </div>

                  <div className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 lg:w-80">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 border border-black"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Access Status
                        </span>
                      </div>
                      <span className="rounded-full border-2 border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {searchMode === "basic" ? "Direct" : "Premium"}
                      </span>
                    </div>
                    <div
                      className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${badge.classes}`}
                    >
                      <span className="h-2 w-2 rounded-full border border-black bg-current"></span>
                      {badge.label}
                    </div>
                    <p className="mb-5 text-xs leading-relaxed text-slate-600 font-medium">
                      {badge.helper}
                    </p>
                    {actionArea()}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (searched && results.length === 0) {
    return (
      <section className="bg-white border-2 border-black rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <svg
            className="h-8 w-8 text-slate-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>
        <p className="text-2xl font-bold font-serif text-slate-900 mb-2">No resumes found</p>
        <p className="text-sm font-medium text-slate-600">
          Adjust your filters or widen the location range to discover more
          talent.
        </p>
      </section>
    );
  }

  return null;
}
