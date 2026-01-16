"use client";

import React from "react";

export function ResumeViewSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            {/* Header Skeleton */}
            <div className="max-w-4xl mx-auto space-y-8 animate-pulse">

                {/* Profile Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 w-full space-y-4">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                        <div className="flex gap-4 pt-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                        </div>
                    </div>
                </div>

                {/* Content Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar / Left Column */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-64" />
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-48" />
                    </div>

                    {/* Main Content / Right Column */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-40" />
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-64" />
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-48" />
                    </div>
                </div>
            </div>
        </div>
    );
}
