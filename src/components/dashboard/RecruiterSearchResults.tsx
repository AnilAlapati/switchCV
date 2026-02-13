import { type ReactNode, useState } from "react";
import { logger } from "@/lib/logger";
import { SearchResult, SearchModeType } from "./RecruiterSearchForm";
import { RecruiterResultCard } from "./RecruiterResultCard";
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
      logger.error({ err }, "Agent outreach failed");
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
      logger.error({ err }, "Analysis failed");
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
            const analysis = analysisResult[result.resumeId];
            const isAnalyzing = analyzingFor === result.resumeId;
            const isDrafting = draftingFor === result.resumeId;

            return (
              <RecruiterResultCard
                key={result.resumeId}
                result={result}
                searchMode={searchMode}
                badge={badge}
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                isDrafting={isDrafting}
                onViewResume={onViewResume}
                onRequestAccess={onRequestAccess}
                onDraftMessage={handleDraftMessage}
                onAnalyzeMatch={handleAnalyzeMatch}
                isAgentLoading={isAgentLoading}
              />
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
