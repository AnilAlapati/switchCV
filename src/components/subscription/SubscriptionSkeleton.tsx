export function SubscriptionSkeleton() {
    return (
        <div className="min-h-screen relative overflow-hidden bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-16">
                {/* Title Mocks */}
                <div className="flex flex-col items-center mb-16 space-y-4">
                    <div className="h-4 w-40 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-12 w-96 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-6 w-2/3 max-w-2xl bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8 items-stretch">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-3xl border border-gray-200 bg-white p-8 h-[600px] animate-pulse relative">
                            <div className="h-6 w-32 bg-gray-200 rounded mb-8"></div>
                            <div className="h-10 w-24 bg-gray-200 rounded mb-8"></div>

                            <div className="space-y-6">
                                {[1, 2, 3, 4, 5].map(j => (
                                    <div key={j} className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                                        <div className="h-4 w-48 bg-gray-200 rounded mt-1"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="h-12 w-full bg-gray-200 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
