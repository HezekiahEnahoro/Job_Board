"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import { Brain, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Job = {
  id: number;
  title: string;
  company: string;
};

export default function PrepInterview({ job }: { job: Job }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Please login to use Interview Prep");
      router.push("/auth");
      return;
    }

    try {
      setGenerating(true);

      const res = await fetch(`${API}/interview-prep/${job.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setGenerated(true);
        toast.success("Interview prep generated!");
      } else if (res.status === 400) {
        const error = await res.json();
        toast.error(error.detail || "Please upload your resume first");
        setOpen(false);
      } else {
        toast.error("Failed to generate prep");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const viewPrep = () => {
    // Navigate to prep page with job_id
    router.push(`/prep/${job.id}`);
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25">
        <Brain className="h-4 w-4 mr-1" />
        Prep Interview
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-400" />
              Interview Prep AI
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {job.title} at {job.company}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!generating && !generated && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold text-white">
                    We&lsquo;ll generate for you:
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    {[
                      "Company research & culture insights",
                      "Technical questions tailored to the role",
                      "Behavioral questions with STAR tips",
                      "Smart questions to ask the interviewer",
                      "Preparation tips & key skills to highlight",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold">
                  Generate Interview Prep
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-lg font-semibold mt-6">
                  Analyzing job & generating prep...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  This takes 10-15 seconds
                </p>
              </div>
            )}

            {generated && !generating && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <h3 className="font-bold text-green-400 mb-2">
                    Interview Prep Ready!
                  </h3>
                  <p className="text-sm text-gray-400">
                    Your personalized prep guide has been generated
                  </p>
                </div>

                <Button
                  onClick={viewPrep}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold">
                  View Prep Guide
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
