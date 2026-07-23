"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  border: "1px solid #d7dddf",
  borderRadius: 6,
  background: "#ffffff",
  color: "#171b20",
};

export function TrafficChart({
  data,
}: {
  data: Array<{ time: string; latency: number; cost: number; passRate: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="#e5e8e6" vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#60707a", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#60707a", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Area
            type="monotone"
            dataKey="latency"
            name="Latency ms"
            stroke="#286f9f"
            fill="#cfe2eb"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="passRate"
            name="Eval pass %"
            stroke="#287a58"
            fill="#d8eadf"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ModelCostChart({
  data,
}: {
  data: Array<{ model: string; cost: number; requests: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 22, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="#e5e8e6" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#60707a", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="model"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#60707a", fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="cost" name="Cost USD" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.model}
                fill={["#286f9f", "#287a58", "#b56b18", "#60707a"][index % 4]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvaluatorChart({
  data,
}: {
  data: Array<{ name: string; pass: number; fail: number }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="#e5e8e6" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#60707a", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#60707a", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="pass" stackId="a" fill="#287a58" name="Pass" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fail" stackId="a" fill="#b56b18" name="Fail" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskDonut({ low, medium, high }: { low: number; medium: number; high: number }) {
  const data = [
    { name: "Low", value: low, fill: "#287a58" },
    { name: "Medium", value: medium, fill: "#b56b18" },
    { name: "High", value: high, fill: "#b44a3a" },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
