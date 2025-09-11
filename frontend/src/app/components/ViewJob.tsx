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
} from "@/components/ui/dialog";

type JobFull = {
  id: number;
  title: string;
  company: string;
  description_text?: string | null;
  apply_url?: string | null;
};

export default function ViewJob({ job }: { job: JobFull }) {
  // 1) Decode HTML entities (&lt;h3&gt; → <h3>)
  const raw = job.description_text ?? "";
  const decoded = he.decode(raw);

  // 2) If it still has tags, parse to React nodes; else render as text
  const hasTags = /<\/?[a-z][\s\S]*>/i.test(decoded);
  const content = hasTags ? parse(decoded) : decoded;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary dark:text-blue-400">
            {job.title} — {job.company}
          </DialogTitle>
        </DialogHeader>

        {/* 3) Typography + dark mode */}
        <div className="max-h-[60vh] overflow-auto">
          <article className="sm max-w-none headings:font-semibold text-primary dark:text-white">
            {content || "No description available."}
          </article>
        </div>

        {job.apply_url && (
          <a
            className="text-blue-600 dark:text-blue-400 mt-3 inline-block"
            href={job.apply_url}
            target="_blank">
            Apply →
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
