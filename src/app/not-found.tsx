"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-xl mb-8 border-l-2 border-blue-500 pl-4">Page not found</p>
            <Link
                href="/"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
                Return Home
            </Link>
        </div>
    );
}
