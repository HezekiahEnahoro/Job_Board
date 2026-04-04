"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Zap,
  FileText,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Mail,
  Download,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
  location?: string | null;
  apply_url?: string | null;
};

type GeneratedResume = {
  id: number;
  tailored_summary: string;
  highlighted_skills: string[];
  reordered_experience: unknown[];
  match_score: number;
  resume_html: string;
  ai_changes: {
    summary_changed: boolean;
    experience_reordered: boolean;
    skills_highlighted: boolean;
  };
};

type CoverLetter = {
  id: number;
  content: string;
};

export default function QuickApply({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [error, setError] = useState("");
  const [showFullResume, setShowFullResume] = useState(false);
  const router = useRouter();

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
      // Generate resume
      const resRes = await fetch(`${API}/resume-generator/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: job.id, template: "modern" }),
      });

      if (!resRes.ok) {
        const errorData = await resRes.json().catch(() => null);
        const errorMsg = errorData?.detail || "Failed to generate resume";
        if (resRes.status === 404 && errorMsg.includes("Profile")) {
          throw new Error("Please upload your resume first at /resume");
        }
        throw new Error(errorMsg);
      }

      const resumeData = await resRes.json();
      setResume(resumeData);

      // Generate cover letter
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
      } else if (clRes.status === 403) {
        // ✅ ADD THIS - Free user tried to generate cover letter
        toast.info("Cover letters are a Pro feature. Upgrade to unlock!", {
          duration: 5000,
        });
        setCoverLetterContent(
          "🔒 Upgrade to Pro to unlock AI Cover Letters!\n\n✨ Pro Features:\n• Unlimited AI cover letters\n• Unlimited resume analyses\n• Priority support\n• Early access to new features\n\nOnly $15/month\n\nClick 'Upgrade to Pro' below to unlock!"
        );
      }

      toast.success("Resume & Cover Letter generated!");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast.error(error.message);
    } finally {
      setGenerating(false);
      setGeneratingCoverLetter(false);
    }
  };

  const copyCoverLetter = () => {
    navigator.clipboard.writeText(coverLetterContent);
    toast.success("Cover letter copied to clipboard!");
  };

  const downloadResume = () => {
    if (resume?.resume_html) {
      const blob = new Blob([resume.resume_html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job.company}_${job.title.replace(/\s+/g, "_")}_Resume.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Resume downloaded!");
    }
  };

  const openResumeInNewTab = () => {
    const newWindow = window.open("", "_blank");
    if (newWindow && resume?.resume_html) {
      newWindow.document.write(resume.resume_html);
      newWindow.document.close();
      toast.success("Resume opened in new tab!");
    }
  };

  const handleApply = async () => {
    if (!job.apply_url) {
      toast.error("No application URL available");
      return;
    }

    try {
      // Track the application
      const token = getToken();
      if (token && resume) {
        const params = new URLSearchParams({
          job_id: job.id.toString(),
          resume_id: resume.id.toString(),
        });

        if (coverLetter) {
          params.append("cover_letter_id", coverLetter.id.toString());
        }

        const trackRes = await fetch(
          `${API}/applications/track-quick-apply?${params.toString()}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (trackRes.ok) {
          toast.success("✅ Application tracked! Check your dashboard.");
        } else {
          toast.warning(
            "Applied but tracking failed. You can track it manually.",
          );
        }
      }
    } catch (error) {
      console.error("Failed to track application:", error);
      toast.warning("Applied but tracking failed. You can track it manually.");
    }

    // Open application URL
    window.open(job.apply_url, "_blank");

    // Small delay before closing modal
    setTimeout(() => {
      setOpen(false);
      toast.success("🚀 Good luck with your application!", { duration: 5000 });
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25"
          onClick={() => {
            setOpen(true);
            if (!resume) handleGenerate();
          }}>
          <Zap className="h-4 w-4 mr-1" />
          Quick Apply
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0 bg-gray-900 border-white/10">
        <div className="p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 pr-8">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 shrink-0" />
              <span className="line-clamp-2">Quick Apply: {job.title}</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-400">
              {job.company} • {job.location || "Remote"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Generating State */}
            {generating && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative p-4 sm:p-6 rounded-full bg-gradient-to-br from-green-600 to-emerald-600">
                    <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-semibold mt-4 sm:mt-6 text-center px-4">
                  {generatingCoverLetter
                    ? "Generating cover letter..."
                    : "Generating your tailored resume..."}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                  This takes 3-5 seconds
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !generating && (
              <div className="rounded-xl sm:rounded-2xl border border-red-500/20 bg-red-500/10 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-red-400 font-semibold mb-2 break-words">
                      {error}
                    </p>
                    {error.includes("resume") && (
                      <Button
                        onClick={() => router.push("/resume")}
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        Upload Resume
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Resume & Cover Letter Generated */}
            {resume && !generating && (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Resume Section */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-xl sm:rounded-2xl border border-green-500/20 bg-green-500/10 p-4 sm:p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-green-400 mb-2">
                          Resume Tailored! ({resume.match_score}% Match)
                        </h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          {resume.ai_changes?.summary_changed && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 shrink-0" />
                              <span>Summary rewritten</span>
                            </div>
                          )}
                          {resume.ai_changes?.experience_reordered && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 shrink-0" />
                              <span>Experience reordered</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {resume.highlighted_skills &&
                      resume.highlighted_skills.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-green-500/20">
                          <p className="text-xs text-gray-400 mb-2">
                            MATCHED SKILLS:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {resume.highlighted_skills
                              .slice(0, 6)
                              .map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium">
                                  {skill}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col sm:flex-col gap-2">
                    <Button
                      onClick={downloadResume}
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                      <Download className="h-4 w-4 mr-2" />
                      Download Resume
                    </Button>
                    <Button
                      onClick={openResumeInNewTab}
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>

                {/* Cover Letter Section */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-xl sm:rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                      <h3 className="text-sm sm:text-base font-bold text-blue-400">
                        AI Cover Letter
                      </h3>
                    </div>

                    <Textarea
                      value={coverLetterContent}
                      onChange={(e) => setCoverLetterContent(e.target.value)}
                      className="min-h-[200px] sm:min-h-[300px] bg-white/5 border-white/10 text-white text-xs sm:text-sm"
                      placeholder="Cover letter will appear here..."
                    />

                    {coverLetter ? (
                      <Button
                        onClick={copyCoverLetter}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 sm:mt-4 border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Cover Letter
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push("/upgrade")}
                        size="sm"
                        className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade to Pro - $15/month
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Apply Button */}
            {resume && (
              <div className="flex flex-col gap-3 pt-4 sm:pt-6 border-t border-white/10">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleApply}
                    className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl shadow-green-500/25">
                    <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="line-clamp-1">
                      Apply Now with Resume & Cover Letter
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10">
                    Cancel
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center px-2">
                  💡 Tip: Download/open the resume and copy the cover letter
                  before applying
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
