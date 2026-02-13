"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface CostData {
  month: string;
  totalCost: number;
  lastAggregated: string;
}

export default function CostDashboard() {
  const [data, setData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/admin/costs");
        if (!response.ok) {
          throw new Error("Failed to fetch cost data");
        }
        const result = await response.json();
        setData(result.costs);
      } catch (err) {
        logger.error({ err }, "Error fetching cost dashboard data");
        setError("Failed to load cost data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center text-red-500">
        {error}
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined
                      ? [`$${value.toFixed(2)}`, "Cost"]
                      : null
                  }
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
