"use client";

import React from "react";
import { logger } from "@/lib/logger";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Error logging - in production, this should use a proper error reporting service
        logger.error({ err: error, errorInfo }, "ErrorBoundary caught error");
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-900">
                    <h3 className="font-bold">Something went wrong.</h3>
                    <pre className="text-xs mt-2 overflow-auto max-w-full">
                        {this.state.error?.message}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
