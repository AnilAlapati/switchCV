import { Brain, Sparkles, Users } from "lucide-react";

export function ModelSelectionSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0] border-y border-black/10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Smart Model Selection
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            We use the right model for each task-powerful reasoning for
            strategy, high-speed execution for writing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-black/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="font-bold text-lg">Free Tier</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Brain className="w-4 h-4 text-blue-600" />
                <span>
                  <strong>All 4 Agents:</strong> Gemini 2.5 Flash Lite
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Fast
                </span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">5 free agent runs included</p>
          </div>
          <div className="bg-black text-white p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-lg">Premium Tier</span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Brain className="w-4 h-4 text-blue-400" />
                <span>
                  <strong>All 4 Agents:</strong> Gemini 2.5 Flash
                </span>
                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                  Smart
                </span>
              </li>
            </ul>
            <p className="text-xs text-gray-400 mt-4">
              Unlimited runs + priority processing
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
