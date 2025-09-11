"use client";
import { useEffect, useState } from "react";
type Row = { company: string; count: number };
import { getErrorMessage } from "@/lib/getErrorMessage";

const API = process.env.NEXT_PUBLIC_API_BASE;
export default function TopCompanies({
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
          `${API}/trends/company_activity?days=${days}&top_k=${topK}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        setRows(data as Row[]);
      } catch (e: unknown) {
        setErr(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [days, topK]);

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (err) return <p className="text-sm text-red-600">Error: {err}</p>;
  if (!rows.length) return <p className="text-sm text-gray-600">No data</p>;

  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.company} className="text-sm">
          <span className="font-medium">
            {i + 1}. {r.company}
          </span>{" "}
          — {r.count}
        </li>
      ))}
    </ol>
  );
}
