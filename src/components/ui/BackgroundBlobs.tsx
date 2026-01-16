import React from 'react';

/**
 * BackgroundBlobs - Refactored for Writer Theme
 * Uses a subtle paper texture effect instead of colored blobs.
 */
export function BackgroundBlobs() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#FFFFF8]">
            {/* Paper texture overlay */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            {/* Subtle geometric shapes for visual interest */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[128px] opacity-5 bg-gray-300"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[128px] opacity-5 bg-gray-200"></div>
        </div>
    );
}
