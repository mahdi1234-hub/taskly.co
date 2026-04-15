"use client";

import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, AlertCircle, BarChart3, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";

type Analytics = {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  recentActivity: { date: string; count: number }[];
};

const COLORS = ["#0a0a0a", "#666666", "#999999", "#cccccc", "#e5e5e5", "#f5f5f5"];

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COMPLETED: CheckCircle,
  PROCESSING: Clock,
  PENDING: Clock,
  FAILED: AlertCircle,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen text-[#999]">
        <p>Failed to load analytics</p>
      </div>
    );
  }

  const completedCount = data.byStatus.find((s) => s.status === "COMPLETED")?.count || 0;
  const processingCount = data.byStatus.find((s) => s.status === "PROCESSING")?.count || 0;
  const failedCount = data.byStatus.find((s) => s.status === "FAILED")?.count || 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="h-16 border-b border-[#e5e5e5] flex items-center px-6">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>

      <div className="p-6 space-y-6 max-w-6xl">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Documents", value: data.total, icon: FileText, color: "text-[#0a0a0a]" },
            { label: "Completed", value: completedCount, icon: CheckCircle, color: "text-green-600" },
            { label: "Processing", value: processingCount, icon: Clock, color: "text-blue-600" },
            { label: "Failed", value: failedCount, icon: AlertCircle, color: "text-red-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#999] font-medium">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Categories Bar Chart */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Documents by Category</h3>
            {data.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: "1px solid #e5e5e5",
                      borderRadius: 8,
                      boxShadow: "none",
                    }}
                  />
                  <Bar dataKey="count" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[#999]">
                No data yet
              </div>
            )}
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Document Status</h3>
            {data.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.byStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[#999]">
                No data yet
              </div>
            )}
          </div>

          {/* Activity Area Chart */}
          <div className="col-span-2 bg-white border border-[#e5e5e5] rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Upload Activity</h3>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: "1px solid #e5e5e5",
                      borderRadius: 8,
                      boxShadow: "none",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0a0a0a"
                    fill="#0a0a0a"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[#999]">
                Upload documents to see activity trends
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
