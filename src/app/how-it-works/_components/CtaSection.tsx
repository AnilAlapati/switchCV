import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { UserMode } from "../types";

export function CtaSection({ mode }: { mode: UserMode }) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-serif font-bold mb-6">
          {mode === "jobseeker"
            ? "Ready to Transform Your Resume?"
            : "Ready to Supercharge Your Recruiting?"}
        </h2>
        <p className="text-gray-600 mb-8">
          {mode === "jobseeker"
            ? "Your first 5 AI agent runs are free. See the difference for yourself."
            : "Start finding better candidates faster. Free tier includes 10 AI-powered searches."}
        </p>
        <Link
          href={
            mode === "jobseeker"
              ? "/auth?mode=signup"
              : "/auth?mode=signup&role=recruiter"
          }
          className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-medium text-lg hover:bg-gray-800 transition-colors"
        >
          {mode === "jobseeker" ? "Generate Your Resume" : "Start Recruiting Smarter"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </div>
    </section>
  );
}
