// frontend/src/app/components/JobsTable.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import ViewJob from "./ViewJob";

type Job = { id: number; title: string; company: string; location?: string; remote_flag?: boolean; posted_at?: string | null; apply_url?: string | null; };
type JobsPage = { total: number; count: number; next: number | null; items: Job[] };

const API = process.env.NEXT_PUBLIC_API_BASE;

// NOTE: no empty string in Select values.
type RemoteFilter = "any" | "true" | "false";
export default function JobsTable() {
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<RemoteFilter>("any");

  const [page, setPage] = useState<JobsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(off = 0) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "25", offset: String(off), days: "30" });
    if (q) params.set("q", q);
    if (skill) params.set("skill", skill);
    if (location) params.set("location", location);
    if (remote !== "any") params.set("remote", remote);

    try {
      const res = await fetch(`${API}/jobs/page?` + params.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data: JobsPage = await res.json();
      setPage(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(offset); /* eslint-disable-next-line */ }, [offset]);
  const applyFilters = () => { setOffset(0); load(0); };

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
          <Select value={remote} onValueChange={(v) => setRemote(v as any)}>
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

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading…</p>}

      {!loading && page && (
        <>
          <div className="text-sm text-gray-600 dark:text-neutral-400">
            Total: {page.total}
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
                {page.items.map((j) => (
                  <tr
                    key={j.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-3">
                      {j.apply_url ? (
                        <a
                          className="font-medium text-blue-600 hover:underline"
                          href={j.apply_url}
                          target="_blank">
                          {j.title}
                        </a>
                      ) : (
                        j.title
                      )}
                    </td>
                    <td className="px-4 py-3">{j.company}</td>
                    <td className="px-4 py-3">
                      {j.location || (j.remote_flag ? "Remote" : "")}
                    </td>
                    <td className="px-4 py-3">
                      {j.posted_at
                        ? new Date(j.posted_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <ViewJob job={j} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - 25))}
              disabled={offset === 0}>
              ← Prev
            </Button>
            <Button
              variant="outline"
              onClick={() => (page.next != null ? setOffset(page.next) : null)}
              disabled={page.next == null}>
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
