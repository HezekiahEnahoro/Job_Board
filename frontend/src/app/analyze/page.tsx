"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Sparkles,
  Brain,
  Target,
  Zap,
  FileText,
  Crown,
  Search,
  Edit3,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
  description_text?: string;
};

type AnalysisResult = {
  id: number;
  job_id: number;
  job_title: string;
  company: string;
  match_score: number;
  missing_keywords: string[];
  strengths: string[];
  suggestions: string;
  cover_letter: string | null;
  analysis_time_seconds: number;
};

type Usage = {
  analyses_used: number;
  analyses_limit: number | null;
  remaining: number | null;
  is_pro: boolean;
  can_analyze: boolean;
};

export default function AnalyzePage() {
  const [step, setStep] = useState(1); // Step wizard
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [generateCover, setGenerateCover] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Manual job entry
  const [manualMode, setManualMode] = useState(false);
  const [manualJobTitle, setManualJobTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    loadUsage();
  }, [router]);
  
  const downloadPDF = async (analysisId: number) => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      return;
    }

    try {
      toast.info("Downloading PDF...");

      const response = await fetch(
        `${API}/ai/analysis/${analysisId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You don't have permission to download this analysis");
        } else if (response.status === 404) {
          toast.error("Analysis not found");
        } else {
          const error = await response.json().catch(() => ({}));
          toast.error(error.detail || "Failed to download PDF");
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_analysis_${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Network error");
    }
  };
  
  const loadUsage = async () => {
      const token = getToken();
      if (!token) return;
  
      try {
        const res = await fetch(`${API}/ai/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (error) {
        console.error("Failed to load usage stats:", error);
      }
    };


  const loadJobs = async (query: string = "") => {
    const token = getToken();
    if (!token) return;

    setLoadingJobs(true);

    try {
      const params = new URLSearchParams({
        limit: "200",
        offset: "0",
        days: "30",
      });

      if (query.trim()) {
        params.set("q", query.trim());
      }

      const res = await fetch(`${API}/jobs/page?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.items || []);
      }
    } finally {
      setLoadingJobs(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedJob = jobs.find((j) => j.id.toString() === selectedJobId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (
        !selectedFile.name.endsWith(".pdf") &&
        !selectedFile.name.endsWith(".docx")
      ) {
        setError("Please upload a PDF or DOCX file");
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a resume");
      return;
    }

    if (!manualMode && !selectedJobId) {
      setError("Please select a job");
      return;
    }

    if (
      manualMode &&
      (!manualJobTitle || !manualCompany || !manualDescription)
    ) {
      setError("Please fill in all job details");
      return;
    }

    if (usage && !usage.can_analyze) {
      toast.error("You've reached your free tier limit. Upgrade to Pro!");
      return;
    }

    setAnalyzing(true);
    setError(null);
    toast.loading("Analyzing your resume with AI...", { id: "analyzing" });

    const formData = new FormData();
    formData.append("file", file);

    if (manualMode) {
      formData.append("job_id", "0");
      formData.append("manual_job_title", manualJobTitle);
      formData.append("manual_company", manualCompany);
      formData.append("manual_description", manualDescription);
    } else {
      formData.append("job_id", selectedJobId.toString());
    }

    formData.append("generate_cover", generateCover.toString());

    try {
      const token = getToken();
      const res = await fetch(`${API}/ai/analyze-resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success("Analysis complete!", { id: "analyzing" });
      loadUsage();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Analysis failed");
      toast.error(error.message || "Analysis failed", { id: "analyzing" });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match!";
    if (score >= 60) return "Good Match";
    return "Needs Improvement";
  };

  // Show results
  if (result) {
    return (
      <div className="container mx-auto max-w-5xl px-6 py-12 space-y-8">
        {/* Match Score */}
        <div className="group relative">
          <div
            className={`absolute -inset-px bg-gradient-to-r ${getScoreColor(result.match_score)} rounded-3xl blur-xl opacity-75`}></div>
          <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-16 text-center">
            <Target className="h-12 w-12 text-white mx-auto mb-6 opacity-50" />
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">
              Match Score
            </p>
            <div
              className={`text-9xl font-black bg-gradient-to-r ${getScoreColor(result.match_score)} bg-clip-text text-transparent mb-6`}>
              {result.match_score.toFixed(0)}%
            </div>
            <p className="text-3xl font-bold mb-2">
              {getScoreLabel(result.match_score)}
            </p>
            <p className="text-gray-400 text-lg">
              {result.job_title} @ {result.company}
            </p>
          </div>
        </div>

        {/* Strengths */}
        {result.strengths && result.strengths.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold">Your Strengths</h3>
            </div>
            <div className="grid gap-4">
              {result.strengths.map((strength, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                  <p className="text-gray-300 leading-relaxed">{strength}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Keywords */}
        {result.missing_keywords && result.missing_keywords.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold">Missing Keywords</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Consider adding these to improve your match:
            </p>
            <div className="flex flex-wrap gap-3">
              {result.missing_keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-5 py-2.5 bg-yellow-500/10 text-yellow-400 rounded-full text-sm font-medium border border-yellow-500/20">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {result.suggestions && (
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold">AI Suggestions</h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-lg">
              {result.suggestions}
            </p>
          </div>
        )}

        {/* Cover Letter */}
        {result.cover_letter && (
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold">Generated Cover Letter</h3>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-white/5 whitespace-pre-wrap text-gray-300 leading-relaxed mb-4">
              {result.cover_letter}
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                navigator.clipboard.writeText(result.cover_letter!);
                toast.success("Cover letter copied!");
              }}>
              Copy to Clipboard
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Primary Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => downloadPDF(result.id)}
              className="h-14 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </Button>

            <Button
              onClick={() => {
                // Navigate to full report page
                router.push(`/analyze/${result.id}`);
              }}
              className="h-14 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25">
              <FileText className="w-5 h-5 mr-2" />
              View Full Report
            </Button>

            <Button
              onClick={() => router.push("/dashboard")}
              className="h-14 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Secondary Action */}
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setFile(null);
              setSelectedJobId("");
              setManualJobTitle("");
              setManualCompany("");
              setManualDescription("");
              setStep(1);
            }}
            className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 text-base">
            Analyze Another Resume
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500">
          ⚡ Completed in {result.analysis_time_seconds.toFixed(1)}s
        </p>
      </div>
    );
  }

  // Main wizard flow
  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-6">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-4">
          AI Resume Analyzer
        </h1>
        <p className="text-gray-400 text-xl">
          Get instant AI-powered feedback on your resume
        </p>
      </div>

      {/* Usage Stats */}
      {usage && !usage.is_pro && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-400" />
              <p className="text-sm text-gray-300">
                <span className="font-bold text-white">
                  {usage.analyses_used}/{usage.analyses_limit}
                </span>{" "}
                analyses used this month
              </p>
            </div>
            {usage.remaining === 0 && (
              <Link href="/upgrade">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition ${
                step >= s
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-white/5 text-gray-500 border border-white/10"
              }`}>
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-0.5 ${step > s ? "bg-purple-600" : "bg-white/10"}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Resume */}
      {step === 1 && (
        <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-12">
          <h2 className="text-3xl font-bold mb-3 text-center">
            Upload Your Resume
          </h2>
          <p className="text-gray-400 text-center mb-8">
            PDF or DOCX format, max 5MB
          </p>

          <div className="relative mb-6">
            <Input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="h-20 bg-white/5 border-white/10 text-white file:bg-white/10 file:text-white file:border-0 file:mr-4 file:px-6 file:h-full cursor-pointer text-lg"
            />
            {file && (
              <CheckCircle2 className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-green-400" />
            )}
          </div>

          {file && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <p className="text-green-400 font-medium">
                ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <Button
            onClick={() => {
              if (file) {
                setStep(2);
                setError(null);
              }
            }}
            disabled={!file}
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50">
            Continue
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Step 2: Select or Enter Job */}
      {step === 2 && (
        <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-12">
          <h2 className="text-3xl font-bold mb-3 text-center">
            Choose Job Posting
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Select from our database or paste your own
          </p>

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setManualMode(false)}
              className={`p-6 rounded-2xl border transition ${
                !manualMode
                  ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-purple-500/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}>
              <Search className="h-6 w-6 mb-2 mx-auto" />
              <p className="font-semibold">Select from Jobs</p>
            </button>
            <button
              onClick={() => setManualMode(true)}
              className={`p-6 rounded-2xl border transition ${
                manualMode
                  ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-pink-500/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}>
              <Edit3 className="h-6 w-6 mb-2 mx-auto" />
              <p className="font-semibold">Paste Job Details</p>
            </button>
          </div>

          {!manualMode ? (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by job title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 bg-white/5 border-white/10 text-white text-lg"
                />
              </div>

              {/* Job Grid */}
              <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
                {loadingJobs ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                    <p>Searching jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">
                    No jobs found matching &ldquo;{searchQuery}&ldquo;
                  </p>
                ) : (
                  jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id.toString())}
                      className={`w-full text-left p-5 rounded-xl border transition ${
                        selectedJobId === job.id.toString()
                          ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}>
                      <p className="font-bold text-lg mb-1">{job.title}</p>
                      <p className="text-gray-400">{job.company}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <Input
                placeholder="Job Title"
                value={manualJobTitle}
                onChange={(e) => setManualJobTitle(e.target.value)}
                className="h-14 bg-white/5 border-white/10 text-white text-lg"
              />
              <Input
                placeholder="Company Name"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                className="h-14 bg-white/5 border-white/10 text-white text-lg"
              />
              <Textarea
                placeholder="Paste the full job description here..."
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="min-h-[200px] bg-white/5 border-white/10 text-white resize-none"
              />
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-14 border-white/10 bg-white/5 hover:bg-white/10 text-base">
              Back
            </Button>
            <Button
              onClick={() => {
                if (
                  (!manualMode && selectedJobId) ||
                  (manualMode &&
                    manualJobTitle &&
                    manualCompany &&
                    manualDescription)
                ) {
                  setStep(3);
                  setError(null);
                }
              }}
              disabled={
                (!manualMode && !selectedJobId) ||
                (manualMode &&
                  (!manualJobTitle || !manualCompany || !manualDescription))
              }
              className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-base">
              Continue
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Analyze */}
      {step === 3 && (
        <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-12">
          <h2 className="text-3xl font-bold mb-3 text-center">
            Review & Analyze
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Ready to get AI-powered insights
          </p>

          {/* Summary */}
          <div className="space-y-4 mb-8">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Resume</p>
              <p className="font-semibold">{file?.name}</p>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Job</p>
              <p className="font-semibold">
                {manualMode ? manualJobTitle : selectedJob?.title || "Unknown"}
              </p>
              <p className="text-gray-400 text-sm">
                {manualMode ? manualCompany : selectedJob?.company || "Unknown"}
              </p>
            </div>
          </div>

          {/* Cover Letter Option */}
          <div className="flex items-center gap-3 p-5 rounded-xl bg-white/5 border border-white/10 mb-8">
            <Checkbox
              id="cover"
              checked={generateCover}
              onCheckedChange={(checked) => setGenerateCover(checked === true)}
            />
            <Label htmlFor="cover" className="cursor-pointer flex-1">
              <FileText className="h-4 w-4 inline mr-2 text-purple-400" />
              Generate cover letter {!usage?.is_pro && "(Pro only)"}
            </Label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1 h-14 border-white/10 bg-white/5 hover:bg-white/10 text-base">
              Back
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || (usage ? !usage.can_analyze : false)}
              className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-base">
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Analyze Resume
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
