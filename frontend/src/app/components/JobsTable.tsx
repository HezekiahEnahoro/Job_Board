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
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="skill">Skill</Label>
          <Input
            id="skill"
            placeholder="e.g. react"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="loc">Location</Label>
          <Input
            id="loc"
            placeholder="e.g. remote, london"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Remote</Label>
          <Select value={remote} onValueChange={(v: RemoteFilter) => setRemote(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="true">Remote</SelectItem>
              <SelectItem value="false">Onsite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters} className="h-10">
          Apply
        </Button>
      </div>

      {/* Error State */}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && page && page.items.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed">
          <p className="text-lg font-semibold">No jobs found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}

      {/* Jobs Table */}
      {!loading && page && page.items.length > 0 && (
        <>
          <div className="text-sm text-gray-600 dark:text-neutral-400">
            Total: {page.total} jobs
          </div>
          
          <div className="overflow-hidden border rounded-2xl bg-white dark:bg-neutral-900 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-800">
              <thead className="bg-gray-50 dark:bg-neutral-800/60">
                <tr className="text-left text-xs font-semibold text-gray-600 dark:text-neutral-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Posted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {page.items.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      {job.apply_url ? (
                        <a className="font-medium text-blue-600 hover:underline"
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {job.title}
                        </a>
                      ) : (
                        job.title
                      )}
                    </td>
                    <td className="px-4 py-3">{job.company}</td>
                    <td className="px-4 py-3">
                      {job.location || (job.remote_flag ? "Remote" : "-")}
                    </td>
                    <td className="px-4 py-3">
                      {job.posted_at
                        ? new Date(job.posted_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <ViewJob job={job} />
                        <Button
                          onClick={() => trackJob(job.id)}
                          size="sm"
                          variant="outline"
                        >
                          Track
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex gap-2 justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - 25))}
              disabled={offset === 0}
            >
              ← Previous
            </Button>
            <span className="text-sm text-gray-600">
              Showing {offset + 1} - {Math.min(offset + 25, page.total)} of {page.total}
            </span>
            <Button
              variant="outline"
              onClick={() => (page.next != null ? setOffset(page.next) : null)}
              disabled={page.next == null}
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}