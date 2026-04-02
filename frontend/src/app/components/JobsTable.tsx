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
  TrendingUp,
} from "lucide-react";
import QuickApply from "./QuickApply";
import PrepInterview from "./PrepInterview";

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
  match_score?: number;
  match_details?: {
    skills_match: number;
    experience_match: number;
    preferences_match: number;
    matched_skills: string[];
    missing_skills: string[];
  };
};

type JobsPage = {
  total: number;
  count?: number;
  matched_count?: number;
  next: number | null;
  items?: Job[];
  jobs?: Job[];
  limit?: number;
  offset?: number;
};

type RemoteFilter = "any" | "true" | "false";

function isJobsPage(value: unknown): value is JobsPage {
  if (!value || typeof value !== "object") return false;
  const v = value as JobsPage;
  return (
    typeof v.total === "number" &&
    (Array.isArray(v.items) || Array.isArray(v.jobs))
  );
}

export default function JobsTable() {
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<RemoteFilter>("any");
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [page, setPage] = useState<JobsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const router = useRouter();

  // Check onboarding status FIRST
  useEffect(() => {
    const checkOnboarding = async () => {
      const token = getToken();
      if (!token) {
        router.push("/auth");
        return;
      }

      // Check if user has completed onboarding
      try {
        const res = await fetch(`${API}/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (!data.completed) {
            // User hasn't completed onboarding - redirect
            router.push("/onboarding");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding:", error);
      }
    };

    checkOnboarding();
  }, []);

  // Check if user has profile
  useEffect(() => {
    const checkProfile = async () => {
      const token = getToken();
      if (!token) {
        setHasProfile(false);
        return;
      }

      try {
        const res = await fetch(`${API}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasProfile(res.ok);
      } catch {
        setHasProfile(false);
      }
    };
    checkProfile();
  }, []);

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
    if (minMatchScore > 0) params.set("min_match_score", String(minMatchScore));
    return params.toString();
  }, [offset, q, skill, location, remote, minMatchScore]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getToken();

    try {
      const endpoint =
        hasProfile && token
          ? `/matching/jobs?${queryString}`
          : `/jobs/page?${queryString}`;

      const res = await fetch(`${API}${endpoint}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
  }, [queryString, hasProfile]);

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

  const getMatchBadgeClass = (score: number) => {
    if (score >= 90)
      return "bg-green-500/20 border-green-500/40 text-green-400";
    if (score >= 80) return "bg-blue-500/20 border-blue-500/40 text-blue-400";
    if (score >= 70)
      return "bg-purple-500/20 border-purple-500/40 text-purple-400";
    if (score >= 60)
      return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
    return "bg-gray-500/20 border-gray-500/40 text-gray-400";
  };

  const jobs = page?.jobs || page?.items || [];

  return (
    <>
      <div className="space-y-6">
        {/* Filters Card */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold">Filters</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
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
                  onValueChange={(v: RemoteFilter) => setRemote(v)}>
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

              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  onClick={applyFilters}
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Match Score Filter */}
        {hasProfile && (
          <div className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold">Match Score Filter</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, 60, 70, 80, 90].map((score) => (
                  <button
                    key={score}
                    onClick={() => {
                      setMinMatchScore(score);
                      setOffset(0);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      minMatchScore === score
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    }`}>
                    {score === 0 ? "All Jobs" : `${score}%+ Match`}
                  </button>
                ))}
              </div>
              {page?.matched_count !== undefined && (
                <p className="text-sm text-gray-400 mt-4">
                  <span className="font-bold text-purple-400">
                    {page.matched_count}
                  </span>{" "}
                  jobs match your profile
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Resume CTA */}
        {!hasProfile && (
          <div className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-75 group-hover:opacity-100 blur-xl transition pointer-events-none"></div>
            <div className="relative rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/30 to-orange-950/30 backdrop-blur-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">
                    Unlock AI Job Matching
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Upload your resume to see personalized match scores and get
                    recommended jobs based on your skills!
                  </p>
                  <Button
                    onClick={() => router.push("/resume")}
                    className="bg-white text-black hover:bg-white/90 font-bold">
                    Upload Resume
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
        {!loading && page && jobs.length === 0 && (
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
                setMinMatchScore(0);
                setOffset(0);
              }}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10">
              Clear Filters
            </Button>
          </div>
        )}

        {/* Jobs List */}
        {!loading && page && jobs.length > 0 && (
          <div className="space-y-6">
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {offset + 1} - {Math.min(offset + 25, page.total)} of{" "}
                <span className="font-bold text-white">{page.total}</span> jobs
              </p>
            </div>

            {/* Jobs Grid */}
            <div className="space-y-4 pb-8">
              {jobs.map((job) => (
                <div key={job.id} className="group/card relative">
                  <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover/card:opacity-100 blur transition pointer-events-none"></div>
                  <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-6 group-hover/card:border-white/20 transition">
                    {/* Match Score Badge - Responsive */}
                    {job.match_score !== undefined && job.match_score > 0 && (
                      <>
                        {/* MOBILE ONLY (< 640px): Badge above content - FROM DOCUMENT 6 */}
                        <div className="flex justify-end mb-3 sm:hidden z-10">
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border ${getMatchBadgeClass(
                              job.match_score,
                            )}`}>
                            <Sparkles className="h-3 w-3 shrink-0" />
                            <span className="font-bold text-xs whitespace-nowrap">
                              {job.match_score}% Match
                            </span>
                          </div>
                        </div>

                        {/* TABLET & DESKTOP (≥ 640px): Badge absolute top-right - FROM DOCUMENT 7 */}
                        <div className="hidden sm:block absolute top-4 right-4 z-10">
                          <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border ${getMatchBadgeClass(
                              job.match_score,
                            )}`}>
                            <Sparkles className="h-4 w-4" />
                            <span className="font-bold text-sm">
                              {job.match_score}% Match
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Job Info */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div>
                          {job.apply_url ? (
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/link inline-flex items-center gap-2 text-lg sm:text-xl font-bold hover:text-blue-400 transition break-words">
                              <span className="line-clamp-2 sm:line-clamp-1">
                                {job.title}
                              </span>
                              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 opacity-0 group-hover/link:opacity-100 transition shrink-0" />
                            </a>
                          ) : (
                            <h3 className="text-lg sm:text-xl font-bold line-clamp-2 sm:line-clamp-1">
                              {job.title}
                            </h3>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="font-medium line-clamp-1">
                              {job.company}
                            </span>
                          </div>

                          {(job.location || job.remote_flag) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="line-clamp-1">
                                {job.location ||
                                  (job.remote_flag ? "Remote" : "-")}
                              </span>
                            </div>
                          )}

                          {job.posted_at && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="whitespace-nowrap">
                                {new Date(job.posted_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Matched skills */}
                        {job.match_details?.matched_skills &&
                          job.match_details.matched_skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {job.match_details.matched_skills
                                .slice(0, 5)
                                .map((skill, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium">
                                    ✓ {skill}
                                  </span>
                                ))}
                            </div>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row gap-2 flex-wrap sm:flex-nowrap">
                        <ViewJob job={job} />
                        {hasProfile && job.apply_url && (
                          <>
                            <QuickApply job={job} />
                            <PrepInterview job={job} /> 
                          </>
                        )}
                        <Button
                          onClick={() => trackJob(job.id)}
                          size="sm"
                          className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 whitespace-nowrap">
                          <Plus className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PAGINATION - WORKING VERSION */}
      {!loading && page && jobs.length > 0 && (
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => {
                const newOffset = Math.max(0, offset - 25);
                console.log("Previous:", offset, "→", newOffset);
                setOffset(newOffset);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background:
                  offset === 0
                    ? "rgba(255, 255, 255, 0.03)"
                    : "rgba(59, 130, 246, 0.2)",
                color: offset === 0 ? "#6b7280" : "white",
                fontWeight: "500",
                fontSize: "14px",
                cursor: offset === 0 ? "not-allowed" : "pointer",
                opacity: offset === 0 ? 0.5 : 1,
                transition: "background 0.2s",
                pointerEvents: "auto",
              }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>

            {/* Page Info */}
            <span
              style={{ color: "#9ca3af", fontSize: "14px", fontWeight: "500" }}>
              Page {Math.floor(offset / 25) + 1} of{" "}
              {Math.ceil((page?.total || 0) / 25)}
            </span>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => {
                const hasMore = offset + 25 < (page?.total || 0);
                const nextOffset = offset + 25;
                console.log("Next:", offset, "→", nextOffset);

                if (hasMore) {
                  setOffset(nextOffset);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background:
                  offset + 25 >= (page?.total || 0)
                    ? "rgba(255, 255, 255, 0.03)"
                    : "rgba(59, 130, 246, 0.2)",
                color: offset + 25 >= (page?.total || 0) ? "#6b7280" : "white",
                fontWeight: "500",
                fontSize: "14px",
                cursor:
                  offset + 25 >= (page?.total || 0) ? "not-allowed" : "pointer",
                opacity: offset + 25 >= (page?.total || 0) ? 0.5 : 1,
                transition: "background 0.2s",
                pointerEvents: "auto",
              }}>
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
