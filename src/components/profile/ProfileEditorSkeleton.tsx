export function ProfileEditorSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4">
                <div className="mb-8 h-10 w-64 bg-gray-200 rounded animate-pulse"></div>

                <div className="bg-white shadow rounded-lg p-6 space-y-6 animate-pulse">

                    {/* Resume Title */}
                    <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 rounded"></div>
                    </div>

                    {/* Summary */}
                    <div>
                        <div className="h-4 w-40 bg-gray-200 rounded mb-2"></div>
                        <div className="h-32 w-full bg-gray-200 rounded"></div>
                    </div>

                    {/* Email */}
                    <div>
                        <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 rounded"></div>
                    </div>

                    {/* Phone */}
                    <div>
                        <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
