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
import { TrendingUp, Target, Clock, CheckCircle2 } from "lucide-react";

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading analytics...</div>
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
      (app) => new Date(app.created_at).toISOString().split("T")[0] === date
    ).length,
  }));

  // Calculate metrics
  const totalApps = stats?.total || 0;
  const appliedCount = stats?.by_status?.applied || 0;
  const interviewCount = stats?.by_status?.interview || 0;
  const offerCount = stats?.by_status?.offer || 0;
  const responseRate =
    totalApps > 0
      ? Math.round(((interviewCount + offerCount) / appliedCount) * 100) || 0
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your job search progress
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Applications
              </p>
              <p className="text-3xl font-bold mt-1">{totalApps}</p>
            </div>
            <Target className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Applied
              </p>
              <p className="text-3xl font-bold mt-1">{appliedCount}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interviews
              </p>
              <p className="text-3xl font-bold mt-1">{interviewCount}</p>
            </div>
            <Clock className="w-10 h-10 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Response Rate
              </p>
              <p className="text-3xl font-bold mt-1">{responseRate}%</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Applications This Week</h3>
          {timelineData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timelineData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No applications this week yet
            </div>
          )}
        </Card>

        {/* Status Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status Breakdown</h3>
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
                  label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No applications to analyze yet
            </div>
          )}
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Insights & Tips</h3>
        <div className="space-y-3 text-sm">
          {totalApps === 0 && (
            <p className="text-gray-600">
              🎯 <strong>Get started:</strong> Track your first application to
              see analytics!
            </p>
          )}
          {appliedCount > 0 && appliedCount < 10 && (
            <p className="text-gray-600">
              📊 <strong>Volume matters:</strong> Most successful job seekers
              apply to 20-30 positions per week.
            </p>
          )}
          {appliedCount >= 10 && interviewCount === 0 && (
            <p className="text-gray-600">
              🤖 <strong>Optimize your resume:</strong> Try our AI Resume
              Analyzer to improve your match scores!
            </p>
          )}
          {responseRate > 0 && responseRate < 10 && (
            <p className="text-gray-600">
              💡 <strong>Low response rate:</strong> Consider tailoring your
              resume for each application.
            </p>
          )}
          {responseRate >= 20 && (
            <p className="text-green-600">
              ✨ <strong>Great response rate!</strong> You&apos;re doing better
              than average. Keep it up!
            </p>
          )}
          {interviewCount > 0 && (
            <p className="text-purple-600">
              🎉{" "}
              <strong>
                You have {interviewCount} interview
                {interviewCount > 1 ? "s" : ""}!
              </strong>{" "}
              Remember to follow up within 24 hours.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
