"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ViewJob from "./ViewJob";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Filter,
  Briefcase,
  ExternalLink,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
  location?: string | null;
  remote_flag?: boolean | null;
  posted_at?: string | null;
  apply_url?: string | null;
  description_text?: string | null;
};

type JobsPage = {
  total: number;
  count: number;
  next: number | null;
  items: Job[];
};

type RemoteFilter = "any" | "true" | "false";

function isJobsPage(value: unknown): value is JobsPage {
  if (!value || typeof value !== "object") return false;
  const v = value as JobsPage;
  return (
    typeof v.total === "number" &&
    typeof v.count === "number" &&
    "next" in v &&
    Array.isArray(v.items)
  );
}

export default function JobsTable() {
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<RemoteFilter>("any");
  const [page, setPage] = useState<JobsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      limit: "25",
      offset: String(offset),
      days: "30",
    });
    if (q) params.set("q", q);
    if (skill) params.set("skill", skill);
    if (location) params.set("location", location);
    if (remote !== "any") params.set("remote", remote);
    return params.toString();
  }, [offset, q, skill, location, remote]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/jobs/page?${queryString}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${txt ? `: ${txt}` : ""}`);
      }
      const json: unknown = await res.json();
      if (!isJobsPage(json)) throw new Error("Unexpected response shape");
      setPage(json);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setOffset(0);
  };

  const trackJob = async (jobId: number) => {
    const token = getToken();
    if (!token) {
      toast.error("Please login to track jobs");
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch(`${API}/applications/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId, status: "saved" }),
      });

      if (res.ok) {
        toast.success("Job saved to tracker!");
      } else if (res.status === 400) {
        toast.warning("Already tracking this job");
      } else {
        toast.error("Failed to track job");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="group relative">
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition"></div>
        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold">Filters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="q" className="text-sm text-gray-400">
                <Search className="h-4 w-4 inline mr-1" />
                Search
              </Label>
              <Input
                id="q"
                placeholder="Job title or keyword..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill" className="text-sm text-gray-400">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Skill
              </Label>
              <Input
                id="skill"
                placeholder="e.g. React, Python..."
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc" className="text-sm text-gray-400">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location
              </Label>
              <Input
                id="loc"
                placeholder="City or remote..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-green-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Remote</Label>
              <Select
                value={remote}
                onValueChange={(v: RemoteFilter) => setRemote(v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="true">Remote</SelectItem>
                  <SelectItem value="false">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={applyFilters}
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-20 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-400">Loading jobs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && page && page.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-20 text-center">
          <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 mb-6">
            <Briefcase className="h-12 w-12 text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No jobs found</h3>
          <p className="text-gray-400 mb-6">
            Try adjusting your filters or search terms
          </p>
          <Button
            onClick={() => {
              setQ("");
              setSkill("");
              setLocation("");
              setRemote("any");
              setOffset(0);
            }}
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Jobs List */}
      {!loading && page && page.items.length > 0 && (
        <div className="space-y-6">
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {offset + 1} - {Math.min(offset + 25, page.total)} of{" "}
              <span className="font-bold text-white">{page.total}</span> jobs
            </p>
          </div>

          {/* Jobs Grid */}
          <div className="space-y-4">
            {page.items.map((job) => (
              <div key={job.id} className="group relative">
                <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition"></div>
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group-hover:border-white/20 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Job Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        {job.apply_url ? (
                          
                          <a  href={job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-2 text-xl font-bold hover:text-blue-400 transition"
                          >
                            {job.title}
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition" />
                          </a>
                        ) : (
                          <h3 className="text-xl font-bold">{job.title}</h3>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{job.company}</span>
                        </div>

                        {(job.location || job.remote_flag) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {job.location || (job.remote_flag ? "Remote" : "-")}
                            </span>
                          </div>
                        )}

                        {job.posted_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(job.posted_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <ViewJob job={job} />
                      <Button
                        onClick={() => trackJob(job.id)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Track
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - 25))}
              disabled={offset === 0}
              className="border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <span className="text-sm text-gray-400">
              Page {Math.floor(offset / 25) + 1} of{" "}
              {Math.ceil(page.total / 25)}
            </span>

            <Button
              variant="outline"
              onClick={() => (page.next != null ? setOffset(page.next) : null)}
              disabled={page.next == null}
              className="border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}