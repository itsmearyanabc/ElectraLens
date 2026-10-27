"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface BreakdownChartProps {
  chartData: Array<{
    name: string;
    additions: number;
    deletions: number;
    isHighlighted: boolean;
  }>;
}

export default function BreakdownChart({ chartData }: BreakdownChartProps) {
  return (
    <div className="h-[220px] min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 4, left: -22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#475467" }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#475467" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E4E7EC",
              backgroundColor: "#FFFFFF",
            }}
            formatter={(val: unknown) => [`${val}%`, "Addition rate"]}
          />
          <Bar
            dataKey="additions"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isHighlighted ? "#F07824" : "#2864DC"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
