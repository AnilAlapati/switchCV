import { motion } from "motion/react";
import type { AgentDefinition } from "../types";

interface AgentCardProps {
  agent: AgentDefinition;
  delay: number;
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-600 border-blue-200",
  amber: "bg-amber-100 text-amber-600 border-amber-200",
  purple: "bg-purple-100 text-purple-600 border-purple-200",
  green: "bg-green-100 text-green-600 border-green-200",
  rose: "bg-rose-100 text-rose-600 border-rose-200",
  indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
};

export function AgentCard({ agent, delay }: AgentCardProps) {
  const Icon = agent.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + delay }}
      className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClasses[agent.color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {agent.modelFree}
        </span>
      </div>
      <h3 className="font-serif font-bold text-xl mb-1">{agent.name}</h3>
      <span className="text-sm text-blue-600 font-medium block mb-3">
        {agent.nickname}
      </span>
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
        {agent.description}
      </p>
      <div className="border-t border-black/5 pt-4">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">
          What it does
        </span>
        <ul className="space-y-2">
          {agent.whatItDoes.map((item, index) => (
            <li
              key={`${agent.id}-${index}`}
              className="flex items-start gap-2 text-sm text-gray-500"
            >
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
