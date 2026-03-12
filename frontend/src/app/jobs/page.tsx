import JobsTable from "../components/JobsTable";
import { Briefcase } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Browse Jobs</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Discover 2,700+ curated opportunities from top companies
        </p>
      </div>

      {/* Jobs Table */}
      <JobsTable />
    </div>
  );
}
