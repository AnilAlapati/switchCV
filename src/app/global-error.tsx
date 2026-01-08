"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to Sentry + logger
        logger.error(
            { error: error.message, digest: error.digest, stack: error.stack },
            "Global error boundary triggered"
        );
    }, [error]);

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                    <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Critical Error
                            </h1>
                            <p className="text-gray-500">
                                A critical error occurred and the application cannot recover.
                            </p>
                            {error.digest && (
                                <p className="text-xs text-gray-400 font-mono mt-2">
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={() => reset()}
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => (window.location.href = "/")}
                                className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
