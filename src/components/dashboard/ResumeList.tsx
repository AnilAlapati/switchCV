import Link from "next/link";
import { ResumeProfile } from "@/types";

interface ResumeListProps {
  resumes: (ResumeProfile & { id: string; numericId?: number })[];
}

export function ResumeList({ resumes }: ResumeListProps) {
  if (!resumes || resumes.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Your Resumes</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {resumes.map((resume) => (
          <Link
            key={resume.id}
            href={`/resumes/${resume.numericId || resume.id}`}
            className="group relative block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-cyan-500/50 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-white group-hover:text-cyan-400">
                  {resume.title || "Untitled Resume"}
                </h4>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                  {resume.summary || "No summary provided"}
                </p>
              </div>
              {resume.published && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  Live
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span>
                Updated {new Date(resume.lastUpdatedAt).toLocaleDateString()}
              </span>
              {resume.templateId && (
                <span className="capitalize">{resume.templateId} Template</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
