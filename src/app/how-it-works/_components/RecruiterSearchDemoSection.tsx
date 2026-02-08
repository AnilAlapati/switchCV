import { ArrowRight, BarChart3, MessageSquare, Search, Sparkles } from "lucide-react";

export function RecruiterSearchDemoSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            See How Our AI Finds the Best Match
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            When you search, our agents do not just match keywords-they deeply
            understand each resume and rank candidates by true fit.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-lg mb-6">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-black/5">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-mono text-gray-500">
                Your Search Query:
              </span>
            </div>
            <p className="mt-2 text-lg font-medium text-gray-900">
              &quot;Looking for a Java engineer with 5+ years experience in
              distributed systems and microservices&quot;
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-black/5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full">
                <MessageSquare className="w-4 h-4" />
                Requirement Agent parses intent
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
              <span className="flex items-center gap-2 bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full">
                <Search className="w-4 h-4" />
                Smart Search Agent scans 500+ resumes
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
              <span className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full">
                <BarChart3 className="w-4 h-4" />
                AI ranks by true fit
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mb-4">
              Top Matches (from 500+ candidates)
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-gray-50 rounded-lg border-2 border-black">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">
                      SC
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Sarah Chen</span>
                      <span className="text-sm text-gray-500 ml-2">
                        Senior Software Engineer
                      </span>
                    </div>
                  </div>
                  <span className="bg-black text-white text-sm font-bold px-3 py-1 rounded-full">
                    94% Match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong className="text-gray-800">Why this match:</strong>{" "}
                  7 years Java experience, led microservices migration at Scale
                  Corp processing 2M daily transactions, expertise in Kafka and
                  distributed caching
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    Java 7+ yrs +
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    Distributed Systems +
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    Microservices +
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    Leadership +
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                      MR
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Marcus Rodriguez</span>
                      <span className="text-sm text-gray-500 ml-2">
                        Backend Engineer
                      </span>
                    </div>
                  </div>
                  <span className="bg-gray-700 text-white text-sm font-bold px-3 py-1 rounded-full">
                    87% Match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong className="text-gray-800">Why this match:</strong>{" "}
                  5 years Java, strong Spring Boot and AWS experience, built
                  event-driven architecture at FinTech startup
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                    Java 5 yrs +
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                    Distributed Systems +
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    Microservices (partial)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                      AK
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Aisha Kumar</span>
                      <span className="text-sm text-gray-500 ml-2">
                        Full Stack Developer
                      </span>
                    </div>
                  </div>
                  <span className="bg-gray-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                    82% Match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong className="text-gray-800">Why this match:</strong>{" "}
                  6 years Java/Kotlin, Docker and Kubernetes expert, designed
                  service mesh for e-commerce platform handling 100k concurrent
                  users
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                    Java 6 yrs +
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                    Microservices +
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    Distributed (learning)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>AI Insight:</strong> Sarah Chen&apos;s profile shows she
                  scaled a payments system similar to your requirements-consider
                  asking about her approach to handling distributed
                  transactions.
                </span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Our agents analyze experience, skills, projects, and achievements-not
          just keyword matching
        </p>
      </div>
    </section>
  );
}
