import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TokenCard from "../components/TokenCard";
import { useTokens } from "../hooks/useLaunchpad";

type Sort = "new" | "mcap" | "graduating";

export default function Home() {
  const { tokens, isLoading, error } = useTokens();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = (tokens ?? []).filter(
      (t) =>
        !needle ||
        t.name.toLowerCase().includes(needle) ||
        t.symbol.toLowerCase().includes(needle) ||
        t.address.toLowerCase() === needle,
    );
    if (sort === "mcap") list = [...list].sort((a, b) => b.marketCapEth - a.marketCapEth);
    if (sort === "graduating") list = list.filter((t) => !t.complete).sort((a, b) => b.progress - a.progress);
    return list;
  }, [tokens, q, sort]);

  const king = useMemo(
    () => (tokens ?? []).filter((t) => !t.complete).sort((a, b) => b.progress - a.progress)[0],
    [tokens],
  );

  return (
    <>
      <section className="hero">
        <h1>Launch a token on Robinhood Chain in seconds</h1>
        <p className="muted">
          Fair launch, no presale. Every token trades on a bonding curve; when it sells out, liquidity moves to the DEX and
          the LP is burned.
        </p>
        <Link to="/create" className="btn btn-primary btn-lg">
          Start a new coin
        </Link>
      </section>

      {king && king.progress > 0 && (
        <section className="king">
          <h2>👑 Closest to graduating</h2>
          <TokenCard token={king} />
        </section>
      )}

      <section className="toolbar">
        <input className="search" placeholder="Search name, ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {(
            [
              ["new", "Newest"],
              ["mcap", "Market cap"],
              ["graduating", "About to graduate"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} className={sort === key ? "chip active" : "chip"} onClick={() => setSort(key)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error">Could not load tokens: {(error as Error).message}</p>}
      {isLoading && <p className="muted">Loading tokens…</p>}
      {tokens && shown.length === 0 && <p className="muted">No tokens yet. Be the first to launch one!</p>}
      <section className="grid">
        {shown.map((t) => (
          <TokenCard key={t.address} token={t} />
        ))}
      </section>
    </>
  );
}
