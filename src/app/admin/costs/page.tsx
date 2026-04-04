"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Lazy-load recharts (~200KB) — only loaded when admin visits this page
const CostChart = dynamic(() => import("./CostChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

interface CostData {
  month: string;
  totalCost: number;
  lastAggregated: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch cost data");
    return r.json();
  });

export default function CostDashboard() {
  const {
    data: result,
    error,
    isLoading,
  } = useSWR<{ costs: CostData[] }>("/api/admin/costs", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300_000,
  });

  const data = result?.costs ?? [];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center text-red-500">
        Failed to load cost data. Please try again later.
      </div>
    );
  }

  const currentMonthCost =
    data.length > 0 ? data[data.length - 1].totalCost : 0;
  const previousMonthCost =
    data.length > 1 ? data[data.length - 2].totalCost : 0;

  // Calculate trend
  const trend =
    previousMonthCost > 0
      ? ((currentMonthCost - previousMonthCost) / previousMonthCost) * 100
      : 0;

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cost & Usage</h2>
          <p className="text-muted-foreground">
            Monitor infrastructure and AI API costs across the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Month Cost
            </CardTitle>
            <span className="h-4 w-4 text-muted-foreground">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonthCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        {/* Placeholder cards for other metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected EOM</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(currentMonthCost * (30 / new Date().getDate())).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated based on current usage
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Monthly Cost Trend</CardTitle>
          <CardDescription>
            Aggregated costs over the last 12 months.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[350px]">
            <CostChart data={data} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
