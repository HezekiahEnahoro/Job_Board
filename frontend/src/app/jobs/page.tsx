import Cards from "../components/Card";
import JobsTable from "../components/JobsTable";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Jobs</h1>
      <Cards title="Search & Results">
        <JobsTable />
      </Cards>
    </div>
  );
}
