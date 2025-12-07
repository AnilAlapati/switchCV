import Link from "next/link";
import { ResumeProfile } from "@/types";

interface ResumeListProps {
  resumes: (ResumeProfile & {
    id: string;
    numericId?: number;
    published?: boolean;
    isPublic?: boolean;
  })[];
}

export function ResumeList({ resumes }: ResumeListProps) {
  if (!resumes || resumes.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#1A2F25] tracking-tight">Your Resumes</h3>
        <span className="text-xs font-bold uppercase tracking-wider text-[#2C4A3B]/60">{resumes.length} Documents</span>
      </div>

      <div className="columns-1 sm:columns-2 gap-6 space-y-6">
        {resumes.map((resume) => (
          <Link
            key={resume.id}
            href={`/resumes/${resume.numericId || resume.id}`}
            className="group break-inside-avoid block rounded-3xl glass-panel p-6 hover:shadow-xl hover:shadow-[#2C4A3B]/10 hover:border-white transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[#2C4A3B]/5 text-[#2C4A3B] rounded-xl group-hover:bg-[#2C4A3B] group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <h4 className="text-lg font-bold text-[#1A2F25] group-hover:text-[#2C4A3B] transition-colors mb-2">
                {resume.title || "Untitled Resume"}
              </h4>
              <p className="text-sm text-[#1A2F25]/70 line-clamp-3 leading-relaxed">
                {resume.summary || "No summary provided. Click to add details to your resume."}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/40 flex items-center justify-between text-xs font-medium text-[#2C4A3B]/50">
              <span>
                Updated {new Date(resume.lastUpdatedAt).toLocaleDateString()}
              </span>
              {resume.templateId && (
                <span className="capitalize bg-white/40 px-2 py-1 rounded border border-white/50 text-[#2C4A3B]/60">{resume.templateId}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
