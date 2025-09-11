"use client";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getErrorMessage } from "@/lib/getErrorMessage";

type Ratio = {
  total: number;
  remote: number;
  onsite: number;
  remote_pct: number;
};

const API = process.env.NEXT_PUBLIC_API_BASE;
const COLORS = ["#0088FE", "#00C49F"];
export default function RemoteRatioPie({ days = 90 }: { days?: number }) {
  const [data, setData] = useState<Ratio | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API}/trends/remote_ratio?days=${days}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`); const json: unknown = await res.json();
        // quick guard
        const maybe = json as Partial<Ratio>;
        if (typeof maybe?.total !== "number") throw new Error("Unexpected response");
        setData(json as Ratio);
      } catch (e: unknown) {
        setErr(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (err) return <p className="text-sm text-red-600">Error: {err}</p>;
  if (!data || data.total === 0)
    return <p className="text-sm text-gray-600">No data</p>;

  const rows = [
    { name: "Remote", value: data.remote },
    { name: "Onsite", value: data.onsite },
  ];

  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label>
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
