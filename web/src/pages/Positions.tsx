import { Link } from "react-router-dom";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import TokenAvatar from "../components/TokenAvatar";
import { Headline, StatRow } from "../components/StatCard";
import { useBalances, useTokens } from "../hooks/useLaunchpad";
import { fmtTokens } from "../lib/format";

export default function Positions() {
  const { address } = useAccount();
  const { tokens, isLoading } = useTokens();
  const balances = useBalances((tokens ?? []).map((t) => t.address), address);

  if (!address) {
    return (
      <div className="page">
        <h1 className="page-title">Portfolio</h1>
        <div className="card empty">Connect your wallet to see the agents you back.</div>
      </div>
    );
  }

  const rows = (tokens ?? [])
    .map((t, i) => {
      const balance = (balances.data?.[i] as bigint | undefined) ?? 0n;
      const priceEth = Number(t.virtualEth) / Number(t.virtualToken);
      return { token: t, balance, valueEth: Number(formatUnits(balance, 18)) * priceEth };
    })
    .filter((r) => r.balance > 0n)
    .sort((a, b) => b.valueEth - a.valueEth);
  const total = rows.reduce((s, r) => s + r.valueEth, 0);

  return (
    <div className="page">
      <h1 className="page-title">Portfolio</h1>
      <div className="card panel">
        <Headline
          label="Portfolio value"
          value={<>{total.toLocaleString("en", { maximumFractionDigits: 5 })}<span className="headline-unit">ETH</span></>}
          caption="At current curve prices · before fees"
        />
        <div className="divider" />
        <StatRow
          items={[
            { label: "Agents backed", value: rows.length },
            { label: "Graduated", value: rows.filter((r) => r.token.migrated).length },
            { label: "Settlement", value: "ETH" },
          ]}
        />
      </div>

      {(isLoading || balances.isLoading) && <p className="muted">Loading…</p>}
      {!isLoading && !balances.isLoading && rows.length === 0 && (
        <div className="card empty">
          You don't back any agents yet. <Link to="/">Explore agents</Link>
        </div>
      )}
      <div className="list">
        {rows.map(({ token, balance, valueEth }) => (
          <Link key={token.address} to={`/token/${token.address}`} className="card list-row">
            <TokenAvatar uri={token.imageURI} symbol={token.symbol} size={44} />
            <div className="list-main">
              <strong>{token.name}</strong>
              <span className="muted small">
                {fmtTokens(balance)} {token.symbol}
              </span>
            </div>
            <div className="list-end">
              <span className="mono">{valueEth.toLocaleString("en", { maximumFractionDigits: 5 })} ETH</span>
              <span className="muted small">{token.migrated ? "On DEX" : `${(token.progress * 100).toFixed(1)}% bonded`}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
