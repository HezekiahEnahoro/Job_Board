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
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

type Profile = {
  full_name: string;
  skills: string[];
  total_skills: number;
  experience_years: number;
  education: any[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
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
        setStep(data.step);
      }
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
        toast.error("Failed to parse resume");
      }
    } catch (error) {
      toast.error("Upload failed");
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
      setStep(5);
      toast.success("Preferences saved!");
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

  const progress = (step / 6) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Step {step} of 6</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 md:p-12">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white">
                Welcome to MyJobPhase! 🎉
              </h1>
              <p className="text-xl text-gray-300">
                Let&apos;s get you set up in 60 seconds
              </p>
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
                  We&apos;ll analyze it to match you with the best jobs
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
                  <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-white font-medium text-lg mb-2">
                    {uploading
                      ? "Analyzing resume..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    PDF, DOC, or DOCX (Max 10MB)
                  </p>
                </div>
              </label>

              {uploading && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-gray-300 mt-3">
                    Parsing your resume with AI...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Profile Preview */}
          {step === 3 && profile && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-3">
                  Here&apos;s What We Found
                </h2>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Full Name</p>
                  <p className="text-white font-medium text-lg">
                    {profile.full_name}
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-sm text-gray-400 mb-2">
                    Skills ({profile.total_skills} total)
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
                  <p className="text-sm text-gray-400 mb-1">Experience</p>
                  <p className="text-white font-medium">
                    {profile.experience_years} positions
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
                  Help us find the perfect jobs for you
                </p>
              </div>

              <div className="space-y-4">
                {/* Job Titles */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Job Titles (Add up to 5)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      value={jobTitleInput}
                      onChange={(e) => setJobTitleInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleAddJobTitle()
                      }
                      placeholder="e.g. Software Engineer"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 min-h-[48px]"
                      disabled={preferences.job_titles.length >= 5}
                    />
                    <Button
                      onClick={handleAddJobTitle}
                      disabled={
                        !jobTitleInput.trim() ||
                        preferences.job_titles.length >= 5
                      }
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 min-h-[48px]">
                      Add Title
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.job_titles.map((title, i) => (
                      <span
                        key={i}
                        className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {title}
                        <button
                          onClick={() => handleRemoveJobTitle(i)}
                          className="text-blue-400 hover:text-blue-300">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
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
                        className={`px-4 py-3 rounded-lg border transition ${
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
                    Preferred Location (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={preferences.location}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          location: e.target.value,
                        })
                      }
                      placeholder="e.g. San Francisco, CA"
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={preferences.job_titles.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg">
                Save Preferences
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* STEP 5: Matched Jobs Preview */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-3">
                  We Found Jobs For You! 🎯
                </h2>
                <p className="text-gray-300">
                  Based on your profile, we matched you with high-quality
                  opportunities
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20 p-6 text-center">
                <p className="text-5xl font-black text-white mb-2">47</p>
                <p className="text-gray-300">Matched Jobs Ready to Browse</p>
              </div>

              <div className="space-y-3">
                <p className="text-gray-300 font-medium">
                  What you can do next:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Browse 3,400+ remote jobs
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Try Quick Apply (AI tailors resume in 3 sec)
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Track applications in one place
                  </div>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg">
                Start Browsing Jobs 🚀
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
