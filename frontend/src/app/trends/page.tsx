import Cards from "../components/Card";
import TopSkillsBar from "../components/TopSkillsBar";
import RemoteRatioPie from "../components/RemoteRatioPie";
import TopCompanies from "../components/TopCompanies";

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Trends</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Cards title="Top Skills (last 90 days)">
          <TopSkillsBar days={90} topK={10} />
        </Cards>
        <Cards title="Remote vs Onsite">
          <RemoteRatioPie days={90} />
        </Cards>
      </div>

      <Cards title="Top Companies (last 90 days)">
        <TopCompanies days={90} topK={10} />
      </Cards>
    </div>
  );
}
