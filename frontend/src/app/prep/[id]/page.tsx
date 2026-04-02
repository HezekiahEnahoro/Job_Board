"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Brain,
  Building2,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Award,
  ArrowLeft,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type InterviewPrep = {
  id: number;
  job_id: number;
  company_overview: string;
  company_culture: string;
  recent_news: string[];
  technical_questions: Array<{
    question: string;
    topic: string;
    difficulty: string;
    sample_answer?: string;
  }>;
  behavioral_questions: Array<{
    question: string;
    category: string;
    star_tip: string;
  }>;
  questions_to_ask: Array<{
    question: string;
    why_ask: string;
    category: string;
  }>;
  preparation_tips: string[];
  key_skills_to_highlight: string[];
};

export default function InterviewPrepPage() {
  const params = useParams();
  const router = useRouter();
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrep();
  }, [params.id]);

  
const loadPrep = async () => {
  const token = getToken();
  if (!token) {
    router.push("/auth");
    return;
  }

  try {
    setLoading(true);

    // params.id is the job_id
    const res = await fetch(`${API}/interview-prep/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setPrep(data);
    } else if (res.status === 404) {
      // Prep doesn't exist yet, generate it
      toast.info("Generating prep...");

      const createRes = await fetch(`${API}/interview-prep/${params.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (createRes.ok) {
        const data = await createRes.json();
        setPrep(data);
        toast.success("Interview prep generated!");
      } else {
        toast.error("Failed to load prep");
        router.push("/jobs");
      }
    } else {
      toast.error("Failed to load prep");
      router.push("/jobs");
    }
  } catch (error) {
    toast.error("Network error");
  } finally {
    setLoading(false);
  }
};
  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === "Easy")
      return "text-green-400 bg-green-500/10 border-green-500/20";
    if (difficulty === "Medium")
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-400">Loading interview prep...</p>
        </div>
      </div>
    );
  }

  if (!prep) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Prep not found</p>
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

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black">Interview Prep Guide</h1>
          </div>
        </div>

        <div className="space-y-8">
          {/* Company Research */}
          <section className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-black">Company Research</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">Overview</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {prep.company_overview}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">
                    Culture & Values
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {prep.company_culture}
                  </p>
                </div>

                {prep.recent_news && prep.recent_news.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-blue-400 mb-3">
                      Recent News
                    </h3>
                    <ul className="space-y-2">
                      {prep.recent_news.map((news, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-gray-300">
                          <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-1" />
                          <span>{news}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Technical Questions */}
          {prep.technical_questions && prep.technical_questions.length > 0 && (
            <section className="group relative">
              <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
              <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Brain className="h-6 w-6 text-purple-400" />
                  <h2 className="text-2xl font-black">Technical Questions</h2>
                </div>

                <div className="space-y-6">
                  {prep.technical_questions.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-white/5 p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-white flex-1">
                          {q.question}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getDifficultyColor(
                            q.difficulty,
                          )}`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        <span className="font-medium text-purple-400">
                          Topic:
                        </span>{" "}
                        {q.topic}
                      </p>
                      {q.sample_answer && (
                        <p className="text-sm text-gray-300 mt-3 pl-4 border-l-2 border-purple-500/50">
                          {q.sample_answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Behavioral Questions */}
          {prep.behavioral_questions &&
            prep.behavioral_questions.length > 0 && (
              <section className="group relative">
                <div className="absolute -inset-px bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="h-6 w-6 text-green-400" />
                    <h2 className="text-2xl font-black">
                      Behavioral Questions (STAR Method)
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {prep.behavioral_questions.map((q, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-white/10 bg-white/5 p-6">
                        <h3 className="font-semibold text-white mb-2">
                          {q.question}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                          <span className="font-medium text-green-400">
                            Category:
                          </span>{" "}
                          {q.category}
                        </p>
                        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                          <p className="text-sm font-medium text-green-400 mb-1">
                            STAR Tip:
                          </p>
                          <p className="text-sm text-gray-300">{q.star_tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          {/* Questions to Ask */}
          {prep.questions_to_ask && prep.questions_to_ask.length > 0 && (
            <section className="group relative">
              <div className="absolute -inset-px bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
              <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Lightbulb className="h-6 w-6 text-yellow-400" />
                  <h2 className="text-2xl font-black">
                    Smart Questions to Ask
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {prep.questions_to_ask.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                          {q.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white mb-2 text-sm">
                        {q.question}
                      </h3>
                      <p className="text-xs text-gray-400">{q.why_ask}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Preparation Tips */}
          {prep.preparation_tips && prep.preparation_tips.length > 0 && (
            <section className="group relative">
              <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
              <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                  <h2 className="text-2xl font-black">Preparation Tips</h2>
                </div>

                <ul className="space-y-3">
                  {prep.preparation_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Key Skills */}
          {prep.key_skills_to_highlight &&
            prep.key_skills_to_highlight.length > 0 && (
              <section className="group relative">
                <div className="absolute -inset-px bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Award className="h-6 w-6 text-pink-400" />
                    <h2 className="text-2xl font-black">
                      Key Skills to Highlight
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {prep.key_skills_to_highlight.map((skill, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}
