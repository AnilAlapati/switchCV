"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CostChartProps {
  data: { month: string; totalCost: number; lastAggregated: string }[];
}

export default function CostChart({ data }: CostChartProps) {
  return (
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
          formatter={(value: unknown) =>
            typeof value === "number" ? [`$${value.toFixed(2)}`, "Cost"] : null
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
  );
}
