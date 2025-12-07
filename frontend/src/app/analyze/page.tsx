"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
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

export default function AnalyzePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [generateCover, setGenerateCover] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    // Load jobs for dropdown
    loadJobs();
  }, [router]);

  const loadJobs = async () => {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API}/jobs/page?limit=100&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setJobs(data.items || []);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file type
      if (
        !selectedFile.name.endsWith(".pdf") &&
        !selectedFile.name.endsWith(".docx")
      ) {
        setError("Please upload a PDF or DOCX file");
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !selectedJobId) {
      toast.error("Please select a resume and a job");
      return;
    }

    setAnalyzing(true);
    toast.loading("Analyzing your resume...", { id: "analyzing" });
    setError(null);
    setResult(null);

    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_id", selectedJobId);
    formData.append("generate_cover", generateCover.toString());

    try {
      const res = await fetch(`${API}/ai/analyze-resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        toast.success("Analysis complete!", { id: "analyzing" });
        const data = await res.json();
        setResult(data);
      }
    } catch (err: any) {
      toast.error(err.message || "Analysis failed", { id: "analyzing" });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match!";
    if (score >= 60) return "Good Match";
    return "Needs Improvement";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">AI Resume Analyzer</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Get instant feedback on your resume match with any job
          </p>
        </div>
      </div>

      {/* Upload Form */}
      {!result && (
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume">Upload Resume (PDF or DOCX)</Label>
            <div className="flex gap-3">
              <Input
                id="resume"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              )}
            </div>
            {file && (
              <p className="text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Select Job to Analyze Against</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title} @ {job.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cover"
              checked={generateCover}
              onCheckedChange={(checked) => setGenerateCover(checked === true)}
            />
            <Label htmlFor="cover" className="cursor-pointer">
              Generate tailored cover letter (takes 5-10 seconds longer)
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={!file || !selectedJobId || analyzing}
            className="w-full h-12 text-lg">
            {analyzing ? (
              <>
                <span className="animate-pulse">Analyzing with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze Resume
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Match Score */}
          <Card className="p-8 text-center">
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                Match Score
              </h2>
              <div
                className={`text-7xl font-bold ${getScoreColor(
                  result.match_score
                )}`}>
                {result.match_score.toFixed(0)}%
              </div>
              <p className="text-xl font-semibold">
                {getScoreLabel(result.match_score)}
              </p>
              <p className="text-sm text-gray-600">
                for {result.job_title} @ {result.company}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                <div
                  className={`h-3 rounded-full ${
                    result.match_score >= 80
                      ? "bg-green-600"
                      : result.match_score >= 60
                      ? "bg-yellow-600"
                      : "bg-red-600"
                  }`}
                  style={{ width: `${result.match_score}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Your Strengths
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Missing Keywords */}
          {result.missing_keywords && result.missing_keywords.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Missing Keywords
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Consider adding these to your resume:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Suggestions */}
          {result.suggestions && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Suggestions</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {result.suggestions}
              </p>
            </Card>
          )}

          {/* Cover Letter */}
          {result.cover_letter && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Generated Cover Letter
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border whitespace-pre-wrap text-sm">
                {result.cover_letter}
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  navigator.clipboard.writeText(result.cover_letter!);
                  alert("Cover letter copied to clipboard!");
                }}>
                Copy to Clipboard
              </Button>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setFile(null);
                setSelectedJobId("");
              }}
              className="flex-1">
              Analyze Another Resume
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              className="flex-1">
              Go to Dashboard
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Analysis completed in {result.analysis_time_seconds.toFixed(1)}{" "}
            seconds
          </p>
        </div>
      )}
    </div>
  );
}
