import Link from "next/link";
import { DashboardResume } from "@/types";

interface ResumeListProps {
  resumes: DashboardResume[];
}

export function ResumeList({ resumes }: ResumeListProps) {
  if (!resumes || resumes.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[black] tracking-tight">Your Resumes</h3>
        <span className="text-xs font-bold uppercase tracking-wider text-[black]/60">{resumes.length} Documents</span>
      </div>

      <div className="columns-1 sm:columns-2 gap-6 space-y-6">
        {resumes.map((resume) => (
          <Link
            key={resume.id}
            href={`/resumes/${resume.numericId || resume.id}`}
            className="group break-inside-avoid block rounded-3xl glass-panel p-6 hover:shadow-xl hover:shadow-[black]/10 hover:border-white transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[black]/5 text-[black] rounded-xl group-hover:bg-[black] group-hover:text-white transition-colors">
                <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {(resume.published || resume.isPublic) && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-100">
                  ● Live
                </span>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-[black] group-hover:text-[black] transition-colors mb-2">
                {resume.title || "Untitled Resume"}
              </h4>
              <p className="text-sm text-[black]/70 line-clamp-3 leading-relaxed">
                {resume.summary || "No summary provided. Click to add details to your resume."}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/40 flex items-center justify-between text-xs font-medium text-[black]/50">
              <span>
                Updated {new Date(resume.lastUpdatedAt).toLocaleDateString()}
              </span>
              {resume.templateId && (
                <span className="capitalize bg-white/40 px-2 py-1 rounded border border-white/50 text-[black]/60">{resume.templateId}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
