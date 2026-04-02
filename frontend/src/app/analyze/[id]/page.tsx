"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Target,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileText,
  ArrowLeft,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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
  created_at: string;
};

export default function AnalysisReportPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [params.id]);

  const loadAnalysis = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/ai/analysis/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      } else {
        toast.error("Analysis not found");
        router.push("/analyze");
      }
    } catch (error) {
      toast.error("Failed to load analysis");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Analysis not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-6 text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-black mb-2">
                Resume Analysis Report
              </h1>
              <p className="text-gray-400">
                {analysis.job_title} @ {analysis.company}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Analyzed on {new Date(analysis.created_at).toLocaleDateString()}
              </p>
            </div>

            <Button
              onClick={() =>
                window.open(
                  `${API}/ai/analysis/${analysis.id}/download`,
                  "_blank",
                )
              }
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Match Score */}
          <div className="group relative">
            <div
              className={`absolute -inset-px bg-gradient-to-r ${getScoreColor(analysis.match_score)} rounded-3xl blur-xl opacity-75`}></div>
            <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-16 text-center">
              <Target className="h-12 w-12 text-white mx-auto mb-6 opacity-50" />
              <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">
                Match Score
              </p>
              <div
                className={`text-9xl font-black bg-gradient-to-r ${getScoreColor(analysis.match_score)} bg-clip-text text-transparent mb-6`}>
                {analysis.match_score.toFixed(0)}%
              </div>
              <p className="text-3xl font-bold mb-2">
                {getScoreLabel(analysis.match_score)}
              </p>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold">Your Strengths</h3>
              </div>
              <div className="grid gap-4">
                {analysis.strengths.map((strength, idx) => (
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
          {analysis.missing_keywords &&
            analysis.missing_keywords.length > 0 && (
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
                  {analysis.missing_keywords.map((keyword, idx) => (
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
          {analysis.suggestions && (
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold">AI Suggestions</h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                {analysis.suggestions}
              </p>
            </div>
          )}

          {/* Cover Letter */}
          {analysis.cover_letter && (
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold">Generated Cover Letter</h3>
              </div>
              <div className="bg-white/5 p-6 rounded-xl border border-white/5 whitespace-pre-wrap text-gray-300 leading-relaxed mb-4">
                {analysis.cover_letter}
              </div>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  navigator.clipboard.writeText(analysis.cover_letter!);
                  toast.success("Cover letter copied!");
                }}>
                Copy to Clipboard
              </Button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/analyze")}
              className="flex-1 h-14 border-white/10 bg-white/5 hover:bg-white/10 text-base">
              Analyze Another Resume
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
