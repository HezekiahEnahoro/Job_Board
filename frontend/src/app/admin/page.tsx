const API = process.env.NEXT_PUBLIC_API_BASE;

async function getStatus() {
  const res = await fetch(`${API}/admin/status`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function AdminPage() {
  const data = await getStatus();
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>Admin</h1>
      <section>
        <h3>Counts</h3>
        <p>
          Total: {data.counts.total} &nbsp; • &nbsp; Last 7d:{" "}
          {data.counts.last_7d}
        </p>
      </section>
      <section>
        <h3>Sources</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}>
          <div>
            <h4>Greenhouse</h4>
            <ul>
              {data.sources.greenhouse.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Lever</h4>
            <ul>
              {data.sources.lever.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Ashby</h4>
            <ul>
              {data.sources.ashby.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
