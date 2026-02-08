import { Dispatch, SetStateAction } from "react";

interface BasicLookupInputProps {
    userId: string;
    setUserId: Dispatch<SetStateAction<string>>;
    loading: boolean;
}

export function BasicLookupInput({
    userId,
    setUserId,
    loading,
}: BasicLookupInputProps) {
    return (
        <div className="space-y-4">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-[black]">
                <span className="h-1.5 w-1.5 rounded-full bg-[black]"></span>
                Resume ID
            </label>
            <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-[black]">
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                    </svg>
                </span>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., 2"
                    disabled={loading}
                    className="w-full rounded-lg border-2 border-black bg-white py-4 pl-12 pr-28 text-lg text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
                />
                <div className="absolute right-2 top-2 bottom-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="h-full rounded-lg bg-black px-4 font-bold text-white shadow-sm border-2 border-black transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <svg
                                className="h-4 w-4 animate-spin"
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
                        ) : (
                            <svg
                                className="h-5 w-5"
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
                        )}
                        Search
                    </button>
                </div>
            </div>
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-[black]/60">
                <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-[black]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                    />
                </svg>
                Enter the unique ID found in the resume URL
            </p>
        </div>
    );
}
