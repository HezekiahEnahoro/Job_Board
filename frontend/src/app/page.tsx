import Cards from "./components/Card";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Welcome to JobBoardX</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Cards title="Jobs">
          <p className="text-sm text-gray-600">
            Browse and filter recent postings.
          </p>
          <a className="inline-block mt-3 text-blue-600" href="/jobs">
            Go to Jobs →
          </a>
        </Cards>
        <Cards title="Trends">
          <p className="text-sm text-gray-600">
            Top skills, remote ratio, and company activity.
          </p>
          <a className="inline-block mt-3 text-blue-600" href="/trends">
            See Trends →
          </a>
        </Cards>
        <Cards title="Admin">
          <p className="text-sm text-gray-600">Sources and ingestion status.</p>
          <a className="inline-block mt-3 text-blue-600" href="/admin">
            Open Admin →
          </a>
        </Cards>
      </div>
    </div>
  );
}
