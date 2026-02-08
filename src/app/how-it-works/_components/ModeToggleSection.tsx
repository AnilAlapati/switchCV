import { Briefcase, UserCheck } from "lucide-react";
import type { UserMode } from "../types";

interface ModeToggleSectionProps {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
}

export function ModeToggleSection({ mode, setMode }: ModeToggleSectionProps) {
  return (
    <section className="py-6 px-6 md:px-12 border-b border-black/10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-500 mr-2">I am a:</span>
          <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-black/10">
            <button
              onClick={() => setMode("jobseeker")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                mode === "jobseeker"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Job Seeker
            </button>
            <button
              onClick={() => setMode("recruiter")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                mode === "recruiter"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Recruiter
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
