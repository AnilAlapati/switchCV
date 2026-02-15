import { Dispatch, SetStateAction, useRef } from "react";

interface PremiumFiltersInputProps {
    skills: string[];
    onAddSkill: (skill: string) => void;
    onRemoveSkill: (index: number) => void;
    location: string;
    setLocation: Dispatch<SetStateAction<string>>;
    loading: boolean;
}

export function PremiumFiltersInput({
    skills,
    onAddSkill,
    onRemoveSkill,
    location,
    setLocation,
    loading,
}: PremiumFiltersInputProps) {
    const skillInputRef = useRef<HTMLInputElement>(null);

    const commitSkill = () => {
        const value = skillInputRef.current?.value ?? "";
        onAddSkill(value);
        if (skillInputRef.current) {
            skillInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[black]">
                    <span className="h-1 w-1 rounded-full bg-purple-500"></span>
                    Skills
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        ref={skillInputRef}
                        type="text"
                        placeholder="e.g., React, Python, AWS"
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                commitSkill();
                            }
                        }}
                        className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-3 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={commitSkill}
                        disabled={loading}
                        className="rounded-lg border-2 border-black bg-black px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-60"
                    >
                        Add Skill
                    </button>
                </div>
                {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {skills.map((skill, idx) => (
                            <span
                                key={`${skill}-${idx}`}
                                className="group inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700"
                            >
                                {skill}
                                <button
                                    type="button"
                                    onClick={() => onRemoveSkill(idx)}
                                    className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-200 text-purple-600 transition-all hover:bg-purple-300 hover:text-purple-800"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[black]">
                    <span className="h-1 w-1 rounded-full bg-purple-500"></span>
                    Location
                </label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <svg
                            className="h-4 w-4"
                            aria-hidden="true"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, region, or remote"
                        disabled={loading}
                        className="w-full rounded-lg border-2 border-black bg-white py-3.5 pl-11 pr-4 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
                    />
                </div>
                <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[black]/60">
                    <svg
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                        aria-hidden="true"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Leave blank to search across all locations
                </p>
            </div>
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <svg
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                                role="status"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Searching...
                        </>
                    ) : (
                        <>
                            <svg
                                className="h-4 w-4"
                                aria-hidden="true"
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
                            Run Filtered Search
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
