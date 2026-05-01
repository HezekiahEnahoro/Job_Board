"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle2,
  Sparkles,
  Target,
  ArrowRight,
  Briefcase,
  MapPin,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

type EducationItem = {
  degree: string;
  school: string;
  location?: string;
  graduation_date?: string;
  gpa?: string;
  achievements?: string[];
};

type Profile = {
  full_name: string;
  skills: string[];
  total_skills: number;
  experience_years: number;
  education: EducationItem[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [preferences, setPreferences] = useState({
    job_titles: [] as string[],
    remote_preference: "remote",
    location: "",
  });
  const [jobTitleInput, setJobTitleInput] = useState("");

  const router = useRouter();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    const res = await fetch(`${API}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.completed) {
        router.push("/jobs");
      } else {
        setStep(data.step as OnboardingStep);
      }
    }
  };

  const fetchMatchCount = async () => {
    const token = getToken();
    if (!token) return;
    setFetchingMatches(true);
    try {
      const res = await fetch(
        `${API}/matching/jobs?limit=1&min_match_score=40&days=30`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setMatchCount(data.matched_count ?? data.total ?? 0);
      }
    } catch {
      setMatchCount(0);
    } finally {
      setFetchingMatches(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const token = getToken();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/onboarding/upload-resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setStep(3);
        toast.success("Resume parsed successfully! ✅");
      } else {
        toast.error("Failed to parse resume. Try a different file.");
      }
    } catch {
      toast.error("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddJobTitle = () => {
    if (jobTitleInput.trim() && preferences.job_titles.length < 5) {
      setPreferences({
        ...preferences,
        job_titles: [...preferences.job_titles, jobTitleInput.trim()],
      });
      setJobTitleInput("");
    }
  };

  const handleRemoveJobTitle = (index: number) => {
    setPreferences({
      ...preferences,
      job_titles: preferences.job_titles.filter((_, i) => i !== index),
    });
  };

  const handleSavePreferences = async () => {
    const token = getToken();

    const res = await fetch(`${API}/onboarding/set-preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    });

    if (res.ok) {
      toast.success("Preferences saved!");
      // Fetch real match count before showing step 5
      await fetchMatchCount();
      setStep(5);
    } else {
      toast.error("Failed to save preferences");
    }
  };

  const handleComplete = async () => {
    const token = getToken();

    await fetch(`${API}/onboarding/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    router.push("/jobs");
  };

  const progress = ((step - 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 md:p-12">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white">
                Welcome to MyJobPhase 🎉
              </h1>
              <p className="text-xl text-gray-300">
                Apply to 10 jobs in the time it takes to apply to one.
                <br />
                Let&apos;s get you set up in 60 seconds.
              </p>
              <div className="grid grid-cols-3 gap-4 py-4">
                {[
                  { icon: Upload, label: "Upload CV" },
                  { icon: Target, label: "Get Matched" },
                  { icon: Zap, label: "Quick Apply" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-xl bg-white/10 border border-white/10">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-300">{label}</p>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                onClick={() => setStep(2)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* STEP 2: Upload Resume */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Upload Your Resume
                </h2>
                <p className="text-gray-300">
                  AI extracts your skills and experience automatically. Takes
                  about 10 seconds.
                </p>
              </div>

              <label className="group relative block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="border-2 border-dashed border-white/30 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-500/10 transition">
                  {uploading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
                      <p className="text-white font-medium text-lg mb-1">
                        Parsing your resume...
                      </p>
                      <p className="text-gray-400 text-sm">
                        Extracting skills, experience, and education
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                      <p className="text-white font-medium text-lg mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-gray-400 text-sm">
                        PDF, DOC, or DOCX · Max 10MB
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* STEP 3: Profile Preview */}
          {step === 3 && profile && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">
                  Resume Parsed ✅
                </h2>
                <p className="text-gray-300">Here&apos;s what we extracted</p>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Name
                  </p>
                  <p className="text-white font-medium text-lg">
                    {profile.full_name}
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Skills detected ({profile.total_skills})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm border border-blue-500/30">
                        {skill}
                      </span>
                    ))}
                    {profile.total_skills > 12 && (
                      <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
                        +{profile.total_skills - 12} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Experience
                  </p>
                  <p className="text-white font-medium">
                    {profile.experience_years} position
                    {profile.experience_years !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-white/20 hover:bg-white/10">
                  Re-upload
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Looks Good
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Job Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-3">
                  What Are You Looking For?
                </h2>
                <p className="text-gray-300">
                  This helps us rank jobs by relevance to you
                </p>
              </div>

              <div className="space-y-5">
                {/* Job Titles */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Job Titles
                    <span className="text-gray-500 ml-1 font-normal">
                      (add up to 5)
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      value={jobTitleInput}
                      onChange={(e) => setJobTitleInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddJobTitle()
                      }
                      placeholder="e.g. Data Engineer, Full Stack Developer"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                      disabled={preferences.job_titles.length >= 5}
                    />
                    <Button
                      onClick={handleAddJobTitle}
                      disabled={
                        !jobTitleInput.trim() ||
                        preferences.job_titles.length >= 5
                      }
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                      Add
                    </Button>
                  </div>
                  {preferences.job_titles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {preferences.job_titles.map((title, i) => (
                        <span
                          key={i}
                          className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-2 text-sm">
                          <Briefcase className="w-3.5 h-3.5" />
                          {title}
                          <button
                            onClick={() => handleRemoveJobTitle(i)}
                            className="text-blue-400 hover:text-white ml-1">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remote Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Work Preference
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["remote", "hybrid", "onsite", "any"].map((pref) => (
                      <button
                        key={pref}
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            remote_preference: pref,
                          })
                        }
                        className={`px-4 py-3 rounded-lg border transition text-sm font-medium ${
                          preferences.remote_preference === pref
                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        }`}>
                        {pref.charAt(0).toUpperCase() + pref.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferred Location
                    <span className="text-gray-500 ml-1 font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={preferences.location}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          location: e.target.value,
                        })
                      }
                      placeholder="e.g. Europe, Remote Worldwide, UK"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={preferences.job_titles.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg">
                {fetchingMatches ? "Finding matches..." : "Save & Find My Jobs"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {preferences.job_titles.length === 0 && (
                <p className="text-center text-sm text-gray-500">
                  Add at least one job title to continue
                </p>
              )}
            </div>
          )}

          {/* STEP 5: Real Match Count + Go */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-2xl bg-green-500/20 border border-green-500/20 mb-4">
                  <Target className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  You&apos;re ready 🎯
                </h2>
                <p className="text-gray-300">
                  Based on your profile, we found jobs waiting for you
                </p>
              </div>

              {/* Real match count */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-8 text-center">
                {fetchingMatches ? (
                  <div className="space-y-2">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                    <p className="text-gray-400 text-sm">
                      Calculating matches...
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-6xl font-black text-white mb-1">
                      {matchCount !== null ? matchCount.toLocaleString() : "—"}
                    </p>
                    <p className="text-gray-300">
                      jobs matched to your profile
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {[
                  "Jobs are ranked by match score — best fits first",
                  "Quick Apply tailors your resume for each job in seconds",
                  "Every application is tracked automatically",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleComplete}
                disabled={fetchingMatches}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg font-bold">
                Browse My Matched Jobs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
