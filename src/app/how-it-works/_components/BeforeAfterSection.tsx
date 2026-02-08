import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { DemoResumeCarousel } from "./DemoResumeCarousel";
import type { BeforeAfterExample, UserMode } from "../types";

interface BeforeAfterSectionProps {
  mode: UserMode;
  examples: BeforeAfterExample[];
}

export function BeforeAfterSection({ mode, examples }: BeforeAfterSectionProps) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            See the Difference
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Real examples of how our agents transform vague statements into
            compelling, quantified achievements.
          </p>
        </div>

        <div className="space-y-8">
          {examples.map((example, index) => (
            <motion.div
              key={`${mode}-${example.category}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-sm"
            >
              <div className="px-6 py-3 bg-gray-50 border-b border-black/5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                  {example.category}
                </span>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                    BEFORE
                  </span>
                  <p className="text-gray-500 line-through italic">
                    &quot;{example.before}&quot;
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    AFTER
                  </span>
                  <p className="text-black font-medium">&quot;{example.after}&quot;</p>
                </div>
              </div>
              <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                <span className="text-sm text-blue-700 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {example.improvement}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <DemoResumeCarousel />
      </div>
    </section>
  );
}
