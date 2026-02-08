import { AgentCard } from "./AgentCard";
import type { AgentDefinition, UserMode } from "../types";

interface AgentCardsSectionProps {
  mode: UserMode;
  agents: AgentDefinition[];
}

export function AgentCardsSection({ mode, agents }: AgentCardsSectionProps) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            {mode === "jobseeker" ? "Meet Your AI Team" : "Your AI Recruiting Squad"}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            {mode === "jobseeker"
              ? "Each agent specializes in a specific task. Together, they deliver results that surpass any single-shot AI."
              : "Six specialized agents work in harmony to transform your recruiting process-from sourcing to hiring."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {agents.map((agent, index) => (
            <AgentCard key={`${mode}-${agent.id}`} agent={agent} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
