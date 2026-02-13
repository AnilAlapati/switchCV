import React from "react";

export function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path
                fillRule="evenodd"
                d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export function BetaBanner() {
    return (
        <div className="mb-16 relative">
            <div className="relative flex items-center gap-4 glass-panel p-4 rounded-xl shadow-lg">
                <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center border border-black/10">
                        <SparklesIcon className="h-5 w-5 text-black" />
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-black">Beta Access Active</h3>
                    <p className="text-sm text-black/70">
                        Subscription management is currently in beta. Payment gateways are
                        disabled for testing purposes.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function RoleSwitcher({
    viewRole,
    onSwitch,
}: {
    viewRole: "jobseeker" | "recruiter";
    onSwitch: (role: "jobseeker" | "recruiter") => void;
}) {
    return (
        <div className="flex justify-center mb-12">
            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button
                    onClick={() => onSwitch("jobseeker")}
                    className={`px-8 py-3 text-sm font-bold transition-all duration-300 rounded-lg ${viewRole === "jobseeker"
                            ? "bg-white text-black shadow-md border border-gray-100"
                            : "text-gray-500 hover:text-black"
                        }`}
                >
                    For Job Seekers
                </button>
                <button
                    onClick={() => onSwitch("recruiter")}
                    className={`px-8 py-3 text-sm font-bold transition-all duration-300 rounded-lg ${viewRole === "recruiter"
                            ? "bg-white text-black shadow-md border border-gray-100"
                            : "text-gray-500 hover:text-black"
                        }`}
                >
                    For Recruiters
                </button>
            </div>
        </div>
    );
}

interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: string[];
}

export function PlanCard({
    plan,
    isCurrent,
}: {
    plan: Plan;
    isCurrent: boolean;
}) {
    return (
        <div
            className={`relative group flex flex-col h-full transition-all duration-500 rounded-xl ${isCurrent ? "scale-105 z-10 shadow-2xl" : "hover:scale-105 z-0 hover:shadow-xl"
                }`}
        >
            <div
                className={`absolute inset-0 rounded-xl border-2 transition-colors duration-300 ${isCurrent
                        ? "border-black bg-white"
                        : "border-gray-200 bg-white group-hover:border-black/50"
                    }`}
            />
            <div className="relative z-10 flex-1 flex flex-col p-8 h-full">
                <div className="mb-8 border-b-2 border-gray-100 pb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3
                            className={`font-serif font-bold text-base uppercase tracking-widest ${isCurrent ? "text-black" : "text-gray-500"
                                }`}
                        >
                            {plan.name}
                        </h3>
                        {isCurrent && (
                            <span className="flex items-center gap-2 px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                Current
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-bold text-black">
                            {plan.price}
                        </span>
                        {plan.price !== "Free" && plan.price !== "Custom" && (
                            <span className="text-gray-400 font-mono text-xs font-bold">
                                /MO
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-gray-600 text-sm mb-8 leading-relaxed min-h-[40px] font-sans">
                    {plan.description}
                </p>
                <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 group/item">
                            <span
                                className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? "bg-blue-600" : "bg-gray-300 group-hover/item:bg-black"
                                    } transition-colors`}
                            />
                            <span className="text-sm text-gray-700 font-medium tracking-tight group-hover/item:text-black transition-colors">
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>
                <button
                    disabled={true}
                    className={`w-full py-4 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-lg border-2 ${isCurrent
                            ? "bg-black border-black text-white"
                            : "bg-transparent border-gray-200 text-gray-400"
                        }`}
                >
                    {isCurrent ? "Active Plan" : "Select Plan"}
                </button>
            </div>
        </div>
    );
}
