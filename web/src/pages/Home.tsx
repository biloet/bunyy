import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import Logo from "../components/Logo";
import PriceChart, { type Point } from "../components/PriceChart";
import { Headline, Pill, StatRow } from "../components/StatCard";
import TokenCard from "../components/TokenCard";
import { useParams, useTokens, useTrades } from "../hooks/useLaunchpad";
import { fmtEth } from "../lib/format";

type Sort = "new" | "mcap" | "graduating";

export default function Home() {
  const { tokens, isLoading, error } = useTokens();
  const trades = useTrades();
  const params = useParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  const stats = useMemo(() => {
    const list = trades.data ?? [];
    const dayAgo = Math.floor(Date.now() / 1000) - 86_400;
    let total = 0n;
    let day = 0n;
    const points: Point[] = [];
    for (const t of list) {
      total += t.ethAmount;
      if (Number(t.timestamp) >= dayAgo) day += t.ethAmount;
      points.push({ t: Number(t.timestamp), v: Number(formatEther(total)) });
    }
    return { total, day, points };
  }, [trades.data]);

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

  const graduated = (tokens ?? []).filter((t) => t.migrated).length;
  const feeBps = params.data?.[4];

  return (
    <>
      <section className="hero">
        <Logo size={88} />
        <div>
          <h1 className="hero-title">bunyy</h1>
          <p className="hero-sub">Launch a token. Trade the curve. Graduate to the DEX.</p>
        </div>
      </section>

      <section className="card panel">
        <Headline
          label="Total volume"
          pill={<Pill>{trades.isFetching ? "Syncing" : "Live"}</Pill>}
          value={fmtEth(stats.total, 4)}
          change={{ text: `+${fmtEth(stats.day, 4)}`, positive: true }}
          changeLabel="ETH last 24h"
          caption="All launches · ETH settlement"
        />
        <div className="divider" />
        <StatRow
          items={[
            { label: "Tokens launched", value: tokens ? tokens.length : "–" },
            { label: "Graduated", value: tokens ? graduated : "–" },
            { label: "Trade fee", value: feeBps !== undefined ? `${feeBps / 100}%` : "–" },
          ]}
        />
        <PriceChart points={stats.points} onRefresh={() => trades.refetch()} emptyText="No trades yet — launch the first token." />
        <Link to="/create" className="btn btn-primary btn-block">
          Launch a token
        </Link>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Tokens</h2>
          <div className="segmented">
            {(
              [
                ["new", "New"],
                ["mcap", "Market cap"],
                ["graduating", "Bonding"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} className={sort === key ? "seg active" : "seg"} onClick={() => setSort(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <input className="search" placeholder="Search name, ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />

        {error && <p className="error">Could not load tokens: {(error as Error).message}</p>}
        {isLoading && <p className="muted">Loading tokens…</p>}
        {tokens && shown.length === 0 && <p className="muted">No tokens yet. Be the first to launch one!</p>}
        <div className="grid">
          {shown.map((t) => (
            <TokenCard key={t.address} token={t} />
          ))}
        </div>
      </section>
    </>
  );
}
