import React from "react";

export type Role = "jobseeker" | "recruiter";

interface RoleFeature {
    id: Role;
    title: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    gradient: string;
    hoverGradient: string;
    borderColor: string;
    bgColor: string;
    activeBg: string;
}

export const ROLES: RoleFeature[] = [
    {
        id: "jobseeker",
        title: "Job Seeker",
        description: "I'm looking for my next opportunity",
        icon: (
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
        ),
        features: [
            "Create AI-powered resumes",
            "Track who views your resume",
            "Control your contact info privacy",
        ],
        gradient: "from-teal-400 to-emerald-500",
        hoverGradient: "hover:from-teal-300 hover:to-emerald-400",
        borderColor: "border-teal-400/50",
        bgColor: "bg-teal-400/5",
        activeBg: "bg-teal-400/10",
    },
    {
        id: "recruiter",
        title: "Recruiter",
        description: "I'm hiring talent for my team",
        icon: (
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        ),
        features: [
            "AI-powered candidate search",
            "Request contact information",
            "Manage candidate pipeline",
        ],
        gradient: "from-blue-400 to-indigo-500",
        hoverGradient: "hover:from-blue-300 hover:to-indigo-400",
        borderColor: "border-blue-400/50",
        bgColor: "bg-blue-400/5",
        activeBg: "bg-blue-400/10",
    },
];

export function SelectRoleHeader() {
    return (
        <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-black mb-6 shadow-lg">
                <svg
                    className="w-8 h-8 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3 text-black">
                How will you use SwitchCV?
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
                Choose your role to get a personalized experience. You can always
                change this later in settings.
            </p>
        </div>
    );
}

interface RoleCardProps {
    role: RoleFeature;
    isSelected: boolean;
    isSubmitting: boolean;
    onSelect: (id: Role) => void;
}

export function RoleCard({ role, isSelected, isSubmitting, onSelect }: RoleCardProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(role.id)}
            disabled={isSubmitting}
            className={`relative p-8 rounded-[2rem] border-2 transition-all duration-300 text-left group ${isSelected
                    ? `${role.borderColor.replace("/50", "")} ${role.activeBg
                    } bg-white shadow-xl`
                    : "border-white/40 bg-white/40 hover:bg-white/60 hover:border-white/60 hover:shadow-lg"
                } ${isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
        >
            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-6 right-6">
                    <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-r ${role.gradient} flex items-center justify-center shadow-sm`}
                    >
                        <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                </div>
            )}

            {/* Icon */}
            <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 shadow-md text-white group-hover:scale-105 transition-transform duration-300`}
            >
                {role.icon}
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold mb-2 text-black">
                {role.title}
            </h2>
            <p className="text-gray-600 text-sm mb-6">{role.description}</p>

            {/* Features */}
            <ul className="space-y-3">
                {role.features.map((feature, idx) => (
                    <li
                        key={idx}
                        className="flex items-center gap-3 text-sm text-gray-700"
                    >
                        <div
                            className={`p-1 rounded-full ${isSelected
                                    ? role.id === "jobseeker"
                                        ? "bg-teal-100 text-teal-600"
                                        : "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                        >
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        {feature}
                    </li>
                ))}
            </ul>
        </button>
    );
}
