"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Target,
  Sparkles,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Stats = {
  total: number;
  by_status: Record<string, number>;
};

type Application = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  saved: "#94a3b8",
  applied: "#3b82f6",
  interview: "#8b5cf6",
  offer: "#10b981",
  rejected: "#ef4444",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [statsRes, appsRes] = await Promise.all([
        fetch(`${API}/applications/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/applications/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (appsRes.ok) setApps(await appsRes.json());
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-white/5 rounded-lg w-64"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-80 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const statusData = stats?.by_status
    ? Object.entries(stats.by_status).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: STATUS_COLORS[status],
      }))
    : [];

  // Applications over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const timelineData = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: apps.filter(
      (app) => new Date(app.created_at).toISOString().split("T")[0] === date,
    ).length,
  }));

  // Calculate metrics
  const totalApps = stats?.total || 0;
  const appliedCount = stats?.by_status?.applied || 0;
  const interviewCount = stats?.by_status?.interview || 0;
  const offerCount = stats?.by_status?.offer || 0;
  const responseRate =
    appliedCount > 0
      ? Math.round(((interviewCount + offerCount) / appliedCount) * 100) || 0
      : 0;

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Analytics Dashboard
          </h1>
        </div>
        <p className="text-gray-400 text-lg">
          Track your job search progress and insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition"></div>
          <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Applications</p>
                <p className="text-4xl font-black mt-1">{totalApps}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition"></div>
          <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Applied</p>
                <p className="text-4xl font-black mt-1">{appliedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10">
                <TrendingUp className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition"></div>
          <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Interviews</p>
                <p className="text-4xl font-black mt-1">{interviewCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition"></div>
          <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Response Rate</p>
                <p className="text-4xl font-black mt-1">{responseRate}%</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <h3 className="text-xl font-bold mb-6">Applications This Week</h3>
            {timelineData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timelineData}>
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02]">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500">No applications this week yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <h3 className="text-xl font-bold mb-6">Status Breakdown</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.name}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#9ca3af", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02]">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500">
                    No applications to analyze yet
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="group relative">
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl opacity-50 blur transition"></div>
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-purple-950/30 backdrop-blur-xl p-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Insights & Tips
          </h3>
          <div className="space-y-4">
            {totalApps === 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Target className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">Get started:</strong> Track
                  your first application to see analytics!
                </p>
              </div>
            )}
            {appliedCount > 0 && appliedCount < 10 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">Volume matters:</strong> Most
                  successful job seekers apply to 20-30 positions per week.
                </p>
              </div>
            )}
            {appliedCount >= 10 && interviewCount === 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">Optimize your resume:</strong>{" "}
                  Try our AI Resume Analyzer to improve your match scores!
                </p>
              </div>
            )}
            {responseRate > 0 && responseRate < 10 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Clock className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">Low response rate:</strong>{" "}
                  Consider tailoring your resume for each application.
                </p>
              </div>
            )}
            {responseRate >= 20 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">Great response rate!</strong>{" "}
                  You're doing better than average. Keep it up!
                </p>
              </div>
            )}
            {interviewCount > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  <strong className="text-white">
                    You have {interviewCount} interview
                    {interviewCount > 1 ? "s" : ""}!
                  </strong>{" "}
                  Remember to follow up within 24 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
