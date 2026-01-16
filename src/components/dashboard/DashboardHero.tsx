"use client";

import { ReactNode } from "react";

interface DashboardHeroProps {
    children: ReactNode;
}

export function DashboardHero({ children }: DashboardHeroProps) {
    return (
        <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="contents md:flex md:w-full md:gap-6 [&>*]:flex-1">
                {children}
            </div>
        </div>
    );
}
