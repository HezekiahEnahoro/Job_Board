"use client";

import { useEffect, useState } from "react";
import { getToken, getCurrentUser, type User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Application = {
  id: number;
  status: string;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  job: {
    id: number;
    title: string;
    company: string;
    location: string | null;
    apply_url: string | null;
  };
};

type Stats = {
  total: number;
  by_status: Record<string, number>;
};

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  interview: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  offer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    Promise.all([
      getCurrentUser(),
      loadApps(),
      loadStats()
    ]).then(([userData]) => {
      setUser(userData);
      setLoading(false);
    });
  }, [router]);

  const loadApps = async () => {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API}/applications/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setApps(data);
    }
  };

  const loadStats = async () => {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API}/applications/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const updateStatus = async (appId: number, newStatus: string) => {
    const token = getToken();
    if (!token) return;

    await fetch(`${API}/applications/${appId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success("Status updated!");

    await Promise.all([loadApps(), loadStats()]);
  };

  const saveNotes = async (appId: number) => {
    const token = getToken();
    if (!token) return;

    await fetch(`${API}/applications/${appId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: noteText }),
    });
    toast.success("Status updated!");
    setEditingNotes(null);
    setNoteText("");
    await loadApps();
  };

  const deleteApp = async (appId: number) => {
    if (!confirm("Remove this application from tracking?")) return;

    const token = getToken();
    if (!token) return;

    await fetch(`${API}/applications/${appId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success("Status updated!");
    await Promise.all([loadApps(), loadStats()]);
  };

  const filtered = apps.filter((a) => filter === "all" || a.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-96"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>
        {user?.is_pro && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
            <Sparkles className="w-3 h-3" />
            PRO
          </span>
        )}
      </div>
      {!user?.is_pro && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Upgrade to Pro for Unlimited Everything
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Unlimited applications, unlimited AI analyses, priority support
                - Only $15/month
              </p>
            </div>
            <Link href="/upgrade">
              <Button className="shrink-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </Card>
      )}
      {user?.is_pro && (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const token = getToken();
            if (!token) return;

            toast.loading("Opening billing portal...", { id: "portal" });

            try {
              const res = await fetch(`${API}/stripe/create-portal`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (res.ok) {
                const data = await res.json();
                window.location.href = data.portal_url;
              } else {
                toast.error("Failed to open billing portal", { id: "portal" });
              }
            } catch (error) {
              toast.error("Network error", { id: "portal" });
            }
          }}>
          Manage Subscription
        </Button>
      )}
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 border rounded-lg bg-white dark:bg-neutral-900">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total
            </div>
          </div>
          {Object.entries({
            saved: "Saved",
            applied: "Applied",
            interview: "Interview",
            offer: "Offers",
            rejected: "Rejected",
          }).map(([key, label]) => (
            <div
              key={key}
              className="p-4 border rounded-lg bg-white dark:bg-neutral-900">
              <div className="text-2xl font-bold">
                {stats.by_status[key] || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <span className="text-sm font-medium">Filter:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No applications yet</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Start tracking your job applications to see them here. Browse jobs
            and click &ldquo;Track&ldquo; to get started!
          </p>
          <div className="mt-6">
            <Link href="/jobs">
              <Button>
                <Target className="mr-2 h-4 w-4" />
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="border rounded-lg p-4 bg-white dark:bg-neutral-900 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{app.job.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {app.job.company}{" "}
                    {app.job.location && `• ${app.job.location}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={app.status}
                    onValueChange={(v) => updateStatus(app.id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteApp(app.id)}>
                    Remove
                  </Button>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  STATUS_COLORS[app.status]
                }`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </span>

              {/* Notes */}
              <div className="mt-3">
                {editingNotes === app.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add notes..."
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNotes(app.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(null);
                          setNoteText("");
                        }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {app.notes ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {app.notes}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic mb-2">
                        No notes
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingNotes(app.id);
                        setNoteText(app.notes || "");
                      }}>
                      {app.notes ? "Edit notes" : "Add notes"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Apply Link */}
              {app.job.apply_url && (
                <a
                  href={app.job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  Apply →
                </a>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-400 mt-2">
                Updated {new Date(app.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}