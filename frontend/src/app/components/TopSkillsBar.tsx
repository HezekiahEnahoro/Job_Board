"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_BASE;
type Row = { skill: string; count: number };

export default function TopSkillsBar({
  days = 90,
  topK = 10,
}: {
  days?: number;
  topK?: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `${API}/trends/skills?days=${days}&top_k=${topK}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setRows(await res.json());
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [days, topK]);

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (err) return <p className="text-sm text-red-600">Error: {err}</p>;
  if (!rows.length) return <p className="text-sm text-gray-600">No data</p>;

  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={rows}>
          <XAxis dataKey="skill" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count">
            {rows.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`hsl(${index * 45}, 70%, 60%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
