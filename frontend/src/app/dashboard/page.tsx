"use client";

import { useEffect, useState, Suspense } from "react";
import { getToken, getCurrentUser, type User } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Sparkles,
  Target,
  Crown,
  TrendingUp,
  Calendar,
  ExternalLink,
  Plus,
  Filter,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  CheckCircle2,
} from "lucide-react";
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
  resume_id?: number | null;
  cover_letter_id?: number | null;
  applied_via?: string | null;
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

const STATUS_CONFIG = {
  saved: {
    label: "Saved",
    color: "from-slate-500 to-slate-600",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    text: "text-slate-400",
  },
  applied: {
    label: "Applied",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
  },
  interview: {
    label: "Interview",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
  },
  offer: {
    label: "Offer",
    color: "from-green-500 to-green-600",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
  },
  rejected: {
    label: "Rejected",
    color: "from-red-500 to-red-600",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
  },
};

const getStatusBadgeClass = (status: string) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  return config
    ? `${config.bg} ${config.text} border ${config.border}`
    : "bg-gray-500/20 text-gray-400 border border-gray-500/20";
};

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    // Check if just upgraded
    const upgraded = searchParams.get("upgraded");

    if (upgraded === "true") {
      // Show success message
      toast.success("🎉 Welcome to MyJobPhase Pro!");

      // Wait 1 second then force refresh user data
      setTimeout(async () => {
        const freshUser = await getCurrentUser();

        setUser(freshUser);
        await Promise.all([loadApps(), loadStats()]);
        setLoading(false);
      }, 1000);
    } else {
      // Normal load
      Promise.all([getCurrentUser(), loadApps(), loadStats()]).then(
        ([userData]) => {
      
          setUser(userData);
          setLoading(false);
        },
      );
    }
  }, [router, searchParams]); // ADD searchParams to dependency array

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
    toast.success("Notes saved!");
    setEditingNotes(null);
    setNoteText("");
    await loadApps();
  };
  const openAuthenticatedUrl = async (url: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast.error("Failed to load document");
        return;
      }

      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const tab = window.open(blobUrl, "_blank");

      // Clean up blob URL after tab opens
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      toast.error("Failed to open document");
    }
  };
  const deleteApp = async (appId: number) => {
    if (!confirm("Remove this application from tracking?")) return;

    const token = getToken();
    if (!token) return;

    await fetch(`${API}/applications/${appId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success("Application removed!");
    await Promise.all([loadApps(), loadStats()]);
  };

  const filtered = apps.filter((a) => filter === "all" || a.status === filter);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-white/5 rounded-lg w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            Application Tracker
          </h1>
          <p className="text-gray-400 mt-2">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>

        {user?.is_pro ? (
          <div className="flex items-center gap-3">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative inline-flex items-center gap-2 px-4 py-2 bg-black rounded-full border border-yellow-500/50">
                <Crown className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">PRO</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10"
              onClick={async () => {
                const token = getToken();
                if (!token) return;

                toast.loading("Opening billing portal...", {
                  id: "portal",
                });

                try {
                  const res = await fetch(`${API}/stripe/create-portal`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  if (res.ok) {
                    const data = await res.json();
                    window.location.href = data.portal_url;
                  } else {
                    toast.error("Failed to open billing portal", {
                      id: "portal",
                    });
                  }
                } catch (error) {
                  toast.error("Network error", { id: "portal" });
                }
              }}>
              Manage Subscription
            </Button>
          </div>
        ) : (
          <Link href="/upgrade">
            <Button className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/25">
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </Link>
        )}
      </div>

      {/* Upgrade Banner */}
      {!user?.is_pro && (
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl opacity-50 group-hover:opacity-75 blur transition"></div>
          <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/50 to-purple-950/50 backdrop-blur-xl p-6 mb-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    Unlock Unlimited Potential
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Unlimited applications, unlimited AI analyses, priority
                    support — Only $15/month
                  </p>
                </div>
              </div>
              <Link href="/upgrade">
                <Button className="bg-white text-black hover:bg-white/90 font-bold shadow-xl whitespace-nowrap">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="group relative col-span-2 sm:col-span-3 md:col-span-1">
            <div className="absolute -inset-px bg-gradient-to-br from-white/10 to-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition"></div>
            <div className="relative h-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
              <div className="text-4xl font-black">{stats.total}</div>
              <div className="text-sm text-gray-400 mt-1">Total</div>
            </div>
          </div>

          {Object.entries({
            saved: "Saved",
            applied: "Applied",
            interview: "Interview",
            offer: "Offers",
            rejected: "Rejected",
          }).map(([key, label]) => {
            const config = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG];
            return (
              <div key={key} className="group relative">
                <div
                  className={`absolute -inset-px bg-gradient-to-br ${config.color} rounded-xl opacity-0 group-hover:opacity-100 blur transition`}></div>
                <div className="relative h-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
                  <div className="text-4xl font-black">
                    {stats.by_status[key] || 0}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between m-1">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-400" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 border-white/10 bg-white/5 hover:bg-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Link href="/jobs">
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10">
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </Button>
        </Link>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="relative group">
          <div className="absolute -inset-px bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
          <div className="relative rounded-2xl border border-dashed border-white/20 bg-white/[0.02] backdrop-blur-xl p-16 text-center">
            <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-6">
              <Target className="h-12 w-12 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No applications yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Start tracking your job applications to see them here. Browse jobs
              and click &quot;Track&quot; to get started!
            </p>
            <Link href="/jobs">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Target className="mr-2 h-5 w-5" />
                Browse 2,700+ Jobs
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const config =
              STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
            // console.log("🔍 App:", app.id, {
            //   applied_via: app.applied_via,
            //   resume_id: app.resume_id,
            //   cover_letter_id: app.cover_letter_id,
            //   shouldShowQuickApply:
            //     app.applied_via === "quick_apply" &&
            //     (app.resume_id || app.cover_letter_id),
            // });
            return (
              <div key={app.id} className="group relative">
                <div
                  className={`absolute -inset-px bg-gradient-to-r ${config.color} rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none`}></div>
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left: Job Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {app.job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                          <span className="font-medium">{app.job.company}</span>
                          {app.job.location && (
                            <>
                              <span>•</span>
                              <span>{app.job.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quick Apply Section */}
                      {app.applied_via === "quick_apply" &&
                      (app.resume_id || app.cover_letter_id) ? (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold flex items-center gap-1.5">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Quick Apply
                            </span>
                            {app.applied_at && (
                              <span className="text-xs text-gray-400">
                                Applied{" "}
                                {new Date(app.applied_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Generated Content Badges */}
                          <div className="flex flex-wrap gap-2">
                            {app.resume_id && (
                              <button
                                onClick={() =>
                                  openAuthenticatedUrl(
                                    `${API}/resume-generator/${app.resume_id}/view`,
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition text-sm font-medium">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                View Tailored Resume
                              </button>
                            )}

                            {app.cover_letter_id && (
                              <button
                                onClick={() =>
                                  openAuthenticatedUrl(
                                    `${API}/cover-letter/${app.cover_letter_id}/view`,
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition text-sm font-medium">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                View Cover Letter
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/prep/${app.job.id}`)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20 transition text-sm font-medium">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                              Prep Interview
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Status Badge + Prep Interview for non-Quick Apply */
                        <div className="inline-flex">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} border ${config.border}`}>
                            {config.label}
                          </div>
                          <button
                            onClick={() => router.push(`/prep/${app.job.id}`)}
                            className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20 transition text-xs font-bold flex items-center gap-1.5">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                              />
                            </svg>
                            Prep Interview
                          </button>
                        </div>
                      )}

                      {/* Notes */}
                      {editingNotes === app.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your notes here..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveNotes(app.id)}
                              className="bg-blue-600 hover:bg-blue-700">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNotes(null);
                                setNoteText("");
                              }}
                              className="border-white/10 bg-white/5 hover:bg-white/10">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {app.notes ? (
                            <p className="text-sm text-gray-300 bg-white/5 rounded-lg p-3 border border-white/5">
                              {app.notes}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              No notes added yet
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingNotes(app.id);
                              setNoteText(app.notes || "");
                            }}
                            className="text-gray-400 hover:text-white">
                            <Edit className="h-3 w-3 mr-1" />
                            {app.notes ? "Edit notes" : "Add notes"}
                          </Button>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/5">
                        {app.job.apply_url && (
                          <a
                            href={app.job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition">
                            View job posting
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <span className="text-xs text-gray-500">
                          Updated{" "}
                          {new Date(app.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      <Select
                        value={app.status}
                        onValueChange={(v) => updateStatus(app.id, v)}>
                        <SelectTrigger className="w-full lg:w-40 border-white/10 bg-white/5 hover:bg-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/10">
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
                        onClick={() => deleteApp(app.id)}
                        className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30">
                        <Trash2 className="h-4 w-4 lg:mr-0 mr-1" />
                        <span className="lg:hidden">Remove</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// WRAP IN SUSPENSE
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/5 rounded-lg w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-white/5 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      }>
      <DashboardContent />
    </Suspense>
  );
}
