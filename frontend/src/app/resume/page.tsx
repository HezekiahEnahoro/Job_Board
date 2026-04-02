"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Globe,
  Github,
  Sparkles,
  FileText,
  Edit,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Profile = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  summary: string;
  skills: string[];
  experience: any[];
  education: any[];
  certifications: any[];
  languages: any[];
  preferences: any;
  resume_file_name: string;
};

export default function ResumePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else if (res.status === 404) {
        setProfile(null);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }

    setUploading(true);
    const token = getToken();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/profile/upload-resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setProfile(data);
      toast.success("Resume uploaded and parsed successfully!");
    } catch (error) {
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-white/5 rounded-lg w-64"></div>
          <div className="h-96 bg-white/5 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 mb-8">
              <Upload className="h-16 w-16 text-purple-400" />
            </div>
            <h1 className="text-4xl font-black mb-4">Create Your Job Profile</h1>
            <p className="text-xl text-gray-400 mb-8">
              Upload your resume and let AI extract your experience, skills, and education automatically.
              This powers our job matching and quick apply features.
            </p>

            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                className="hidden"
                id="resume-upload"
                disabled={uploading}
              />
              <label htmlFor="resume-upload">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={uploading}
                  asChild>
                  <span className="cursor-pointer">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Uploading & Parsing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Resume (PDF)
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-semibold text-white">AI Parsing</p>
                  <p>Automatically extracts all your info</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Award className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-semibold text-white">Job Matching</p>
                  <p>Find jobs that match your skills</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-semibold text-white">Quick Apply</p>
                  <p>Apply to jobs in one click</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">My Resume</h1>
            <p className="text-gray-400">
              Your professional profile for job matching
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
              id="resume-reupload"
              disabled={uploading}
            />
            <label htmlFor="resume-reupload">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5"
                disabled={uploading}
                asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Re-upload Resume"}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="group relative">
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur"></div>
        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
              <FileText className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black mb-4">
                {profile.full_name || "No name set"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {profile.email && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm">
                    <Globe className="h-4 w-4" />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>

          {profile.summary && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold text-gray-400 mb-2">SUMMARY</h3>
              <p className="text-gray-300 leading-relaxed">{profile.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-green-400" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Experience */}
      {profile.experience && profile.experience.length > 0 && (
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              Experience
            </h3>
            <div className="space-y-6">
              {profile.experience.map((exp, i) => (
                <div
                  key={i}
                  className="pb-6 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-bold">{exp.title}</h4>
                      <p className="text-blue-400">{exp.company}</p>
                    </div>
                    <div className="text-sm text-gray-400 text-right">
                      <p>
                        {exp.start_date} - {exp.end_date || "Present"}
                      </p>
                      {exp.location && <p>{exp.location}</p>}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-gray-400 text-sm mb-3">
                      {exp.description}
                    </p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      {exp.achievements.map(
                        (achievement: string, j: number) => (
                          <li key={j}>{achievement}</li>
                        ),
                      )}
                    </ul>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {exp.technologies.map((tech: string, j: number) => (
                        <span
                          key={j}
                          className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-400" />
              Education
            </h3>
            <div className="space-y-4">
              {profile.education.map((edu, i) => (
                <div
                  key={i}
                  className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold">{edu.degree}</h4>
                      <p className="text-purple-400">{edu.school}</p>
                      {edu.location && (
                        <p className="text-sm text-gray-400">{edu.location}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 text-right">
                      {edu.graduation_date && <p>{edu.graduation_date}</p>}
                      {edu.gpa && <p>GPA: {edu.gpa}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur"></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Certifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.certifications.map((cert, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="font-bold">{cert.name}</h4>
                  <p className="text-sm text-yellow-400">{cert.issuer}</p>
                  {cert.date && (
                    <p className="text-xs text-gray-400 mt-1">{cert.date}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}