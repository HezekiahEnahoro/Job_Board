"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import he from "he";
import parse from "html-react-parser";
import {
  Zap,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Mail,
  Download,
  Copy,
  Building2,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
  location?: string | null;
  remote_flag?: boolean | null;
  apply_url?: string | null;
  description_text?: string | null;
};

type GeneratedResume = {
  id: number;
  highlighted_skills: string[];
  match_score: number;
  resume_html: string;
  ai_changes: {
    summary_changed: boolean;
    experience_reordered: boolean;
    skills_highlighted: boolean;
  };
};

type CoverLetter = { id: number; content: string };

export default function QuickApply({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const rawDesc = job.description_text ?? "";
  const decoded = rawDesc ? he.decode(rawDesc) : "";
  const hasTags = /<\/?[a-z][\s\S]*>/i.test(decoded);
  const descContent = decoded ? (hasTags ? parse(decoded) : decoded) : null;

  const resetState = () => {
    setResume(null);
    setCoverLetter(null);
    setCoverLetterContent("");
    setError("");
  };

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      router.push("/auth");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const resRes = await fetch(`${API}/resume-generator/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: job.id, template: "modern" }),
      });
      if (!resRes.ok) {
        const d = await resRes.json().catch(() => null);
        const msg = d?.detail || "Failed to generate resume";
        if (resRes.status === 404 && msg.includes("Profile"))
          throw new Error("Please upload your resume first at /resume");
        throw new Error(msg);
      }
      setResume(await resRes.json());
      setGeneratingCoverLetter(true);
      const clRes = await fetch(`${API}/cover-letter/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: job.id }),
      });
      if (clRes.ok) {
        const clData = await clRes.json();
        setCoverLetter(clData);
        setCoverLetterContent(clData.content);
        toast.success("Resume & Cover Letter ready!");
      } else if (clRes.status === 403) {
        setCoverLetterContent(
          "🔒 Upgrade to Pro to unlock AI Cover Letters!\n\n✨ Pro Features:\n• Unlimited AI cover letters\n• Unlimited resume analyses\n• Priority support\n• Early access to new features\n\nOnly $15/month",
        );
        toast.success("Resume ready! Upgrade to Pro for cover letters.");
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
      toast.error(e.message);
    } finally {
      setGenerating(false);
      setGeneratingCoverLetter(false);
    }
  };

  const downloadResume = () => {
    if (!resume?.resume_html) return;
    const blob = new Blob([resume.resume_html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.company}_${job.title.replace(/\s+/g, "_")}_Resume.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded!");
  };

  const openResumeInNewTab = () => {
    if (!resume?.resume_html) return;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(resume.resume_html);
      w.document.close();
    }
  };

  const handleApply = async () => {
    if (!job.apply_url) {
      toast.error("No application URL available");
      return;
    }
    try {
      const token = getToken();
      if (token && resume) {
        const params = new URLSearchParams({
          job_id: job.id.toString(),
          resume_id: resume.id.toString(),
        });
        if (coverLetter)
          params.append("cover_letter_id", coverLetter.id.toString());
        await fetch(`${API}/applications/track-quick-apply?${params}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Application tracked!");
      }
    } catch {
      /* non-critical */
    }
    window.open(job.apply_url, "_blank");
    setTimeout(() => {
      setOpen(false);
      toast.success("🚀 Good luck!", { duration: 5000 });
    }, 500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
          <Zap className="h-4 w-4 mr-1" />
          Quick Apply
        </Button>
      </DialogTrigger>

      {/*
        Width:  95vw on mobile, up to 90vw capped at 1400px on desktop
        Height: 92vh fixed so both panels scroll independently
        Layout: single column on mobile (description capped at 35vh, generate below)
                two columns on lg+ (each panel scrolls independently)
      */}
      <DialogContent
        className="p-0 gap-0 bg-gray-950 border-white/10 flex flex-col"
        style={{
          width: "min(95vw, 1400px)",
          maxWidth: "90vw",
          height: "92vh",
          overflow: "hidden",
        }}>
        {/* ── Header ── */}
        <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-black flex items-center gap-2 pr-8 leading-tight">
              <Sparkles className="h-5 w-5 text-green-400 shrink-0" />
              <span className="line-clamp-2">{job.title}</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {job.company}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {job.location}
                  </span>
                )}
                {job.remote_flag && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium">
                    Remote
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT — Job Description
              Mobile:  fixed 35vh so generate section is always visible below
              Desktop: full height, independent scroll */}
          <div
            className="lg:w-[42%] lg:border-r border-white/10 overflow-y-auto border-b lg:border-b-0"
            style={{ maxHeight: "65vh", flexShrink: 0 }}
            // On lg override via CSS below
          >
            <style>{`
              @media (min-width: 1024px) {
                .desc-panel { max-height: none !important; height: 100%; }
              }
            `}</style>
            <div
              className="desc-panel p-4 sm:p-5"
              style={{ maxHeight: "35vh" }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Job Description
              </p>
              {descContent ? (
                <article
                  className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-white prose-headings:font-bold prose-headings:text-sm prose-headings:mt-4 prose-headings:mb-1
                  prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-sm prose-p:my-2
                  prose-ul:text-gray-300 prose-ul:my-2 prose-ol:text-gray-300
                  prose-li:text-gray-300 prose-li:text-sm prose-li:leading-relaxed
                  prose-strong:text-white prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                  {descContent}
                </article>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  No description available.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT — Generate & Apply
              Mobile:  fills remaining space, scrolls independently
              Desktop: fills remaining space, scrolls independently */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 sm:p-5 space-y-4">
              {/* Pre-generate */}
              {!resume && !generating && !error && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/20 mb-4">
                    <Zap className="h-9 w-9 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Ready to Apply?</h3>
                  <p className="text-gray-400 text-sm mb-5 max-w-xs">
                    AI will tailor your resume and write a cover letter for this
                    role.
                  </p>
                  <Button
                    onClick={handleGenerate}
                    className="h-11 px-8 font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Resume & Cover Letter
                  </Button>
                </div>
              )}

              {/* Generating */}
              {generating && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse" />
                    <div className="relative p-4 rounded-full bg-gradient-to-br from-green-600 to-emerald-600">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  </div>
                  <p className="font-semibold">
                    {generatingCoverLetter
                      ? "Writing cover letter…"
                      : "Tailoring your resume…"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Takes 3–5 seconds
                  </p>
                </div>
              )}

              {/* Error */}
              {error && !generating && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-400 font-medium text-sm mb-3 break-words">
                        {error}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {error.includes("resume") && (
                          <Button
                            onClick={() => {
                              setOpen(false);
                              router.push("/resume");
                            }}
                            size="sm"
                            variant="outline"
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                            Upload Resume
                          </Button>
                        )}
                        <Button
                          onClick={handleGenerate}
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/5 hover:bg-white/10">
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated output */}
              {resume && !generating && (
                <div className="space-y-4">
                  {/* Resume */}
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      <h3 className="font-bold text-green-400 text-sm">
                        Resume Tailored — {resume.match_score}% Match
                      </h3>
                    </div>
                    {resume.highlighted_skills?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                          Matched Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resume.highlighted_skills
                            .slice(0, 8)
                            .map((skill, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium">
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={downloadResume}
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={openResumeInNewTab}
                        variant="outline"
                        size="sm"
                        className="border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>

                  {/* Cover letter */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                      <h3 className="font-bold text-blue-400 text-sm">
                        Cover Letter
                      </h3>
                      {!coverLetter && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-medium">
                          Pro
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={coverLetterContent}
                      onChange={(e) => setCoverLetterContent(e.target.value)}
                      className="min-h-[140px] sm:min-h-[180px] bg-white/5 border-white/10 text-white text-sm resize-none"
                      placeholder="Cover letter will appear here…"
                    />
                    <div className="mt-3">
                      {coverLetter ? (
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(coverLetterContent);
                            toast.success("Copied!");
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Cover Letter
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setOpen(false);
                            router.push("/upgrade");
                          }}
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Upgrade to Pro — $15/month
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Apply */}
                  <div className="pt-1">
                    <Button
                      onClick={handleApply}
                      className="w-full h-12 text-sm sm:text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                      <ExternalLink className="h-5 w-5 mr-2 shrink-0" />
                      {coverLetter
                        ? "Apply Now with Resume & Cover Letter"
                        : "Apply Now with Resume"}
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      💡 Download your resume and copy the cover letter before
                      clicking Apply
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
