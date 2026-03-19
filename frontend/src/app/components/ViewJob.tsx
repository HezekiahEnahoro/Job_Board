"use client";

import he from "he";
import parse from "html-react-parser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, Briefcase } from "lucide-react";

type JobFull = {
  id: number;
  title: string;
  company: string;
  location?: string | null;
  remote_flag?: boolean | null;
  description_text?: string | null;
  apply_url?: string | null;
};

export default function ViewJob({ job }: { job: JobFull }) {
  const raw = job.description_text ?? "";
  const decoded = he.decode(raw);
  const hasTags = /<\/?[a-z][\s\S]*>/i.test(decoded);
  const content = hasTags ? parse(decoded) : decoded;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/5 hover:bg-white/10"
        >
          <Briefcase className="h-4 w-4 mr-1" />
          View
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] bg-gray-950 border-white/10">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="text-2xl font-bold text-white">
            {job.title}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-base mt-2">
            {job.company}
            {job.location && (
              <>
                {" • "}
                {job.location}
              </>
            )}
            {job.remote_flag && " • Remote"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Description */}
        <div className="overflow-y-auto max-h-[60vh] py-4">
          <article className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-ul:text-gray-300 prose-ol:text-gray-300
            prose-li:text-gray-300 prose-li:leading-relaxed
            prose-strong:text-white prose-strong:font-semibold
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
            {content || (
              <p className="text-gray-500 italic">No description available.</p>
            )}
          </article>
        {/* Apply Button */}
        {job.apply_url && (
          <div className="border-t border-white/10 pt-4">
            
            <a  href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-semibold">
                <ExternalLink className="h-5 w-5 mr-2" />
                Apply Now
              </Button>
            </a>
          </div>
        )}
        </div>

      </DialogContent>
    </Dialog>
  );
}