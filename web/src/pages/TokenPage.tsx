import { useParams as useRouteParams } from "react-router-dom";
import { isAddress, type Address } from "viem";
import { useMemo } from "react";
import PriceChart, { type Point } from "../components/PriceChart";
import { Headline, Pill, StatRow } from "../components/StatCard";
import ProgressBar from "../components/ProgressBar";
import TokenAvatar from "../components/TokenAvatar";
import TradePanel from "../components/TradePanel";
import { launchpad, useParams, usePair, useToken, useTrades } from "../hooks/useLaunchpad";
import { useTx } from "../hooks/useTx";
import { explorerLink, fmtEth, fmtTokens, shortAddr, timeAgo } from "../lib/format";

const price = (virtualEth: bigint, virtualToken: bigint) => Number(virtualEth) / Number(virtualToken);

function AddrLink({ value }: { value: string }) {
  const href = explorerLink("address", value);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">{shortAddr(value)}</a>
  ) : (
    <span>{shortAddr(value)}</span>
  );
}

export default function TokenPage() {
  const { address } = useRouteParams();
  if (!address || !isAddress(address)) return <p className="error">Invalid token address.</p>;
  return <TokenView address={address} />;
}

function TokenView({ address }: { address: Address }) {
  const { token, isLoading, error } = useToken(address);
  const trades = useTrades(address);
  const params = useParams();
  const pair = usePair(address, Boolean(token?.migrated));
  const migrateTx = useTx();

  // Market cap in ETH = price × total supply (in whole tokens).
  const supply = params.data ? Number(params.data[0]) / 1e18 : 0;
  const startCap = params.data ? price(params.data[2], params.data[3]) * supply : 0;
  const points = useMemo<Point[]>(() => {
    const list = trades.data ?? [];
    if (!token || list.length === 0) return [];
    return [
      { t: Number(token.createdAt), v: startCap },
      ...list.map((t) => ({ t: Number(t.timestamp), v: price(t.virtualEth, t.virtualToken) * supply })),
    ];
  }, [trades.data, token, startCap, supply]);

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !token) return <p className="error">Token not found on this launchpad.</p>;

  const recent = [...(trades.data ?? [])].reverse();
  const change = startCap ? (token.marketCapEth / startCap - 1) * 100 : 0;
  const gwei = price(token.virtualEth, token.virtualToken) * 1e9;

  return (
    <div className="token-page">
        <div className="token-head">
          <TokenAvatar uri={token.imageURI} symbol={token.symbol} size={72} />
          <div>
            <h1>
              {token.name} <span className="muted">${token.symbol}</span>
            </h1>
            <div className="muted small">
              Created by <AddrLink value={token.creator} /> {timeAgo(token.createdAt)} · Contract <AddrLink value={token.address} />
            </div>
          </div>
        </div>

        <div className="card panel token-panel">
          <Headline
            label="Market cap"
            pill={
              token.migrated ? (
                <Pill>Graduated</Pill>
              ) : token.complete ? (
                <Pill tone="warn">Migrating</Pill>
              ) : (
                <Pill>Bonding</Pill>
              )
            }
            value={<>{token.marketCapEth.toLocaleString("en", { maximumFractionDigits: 3 })}<span className="headline-unit">ETH</span></>}
            change={{ text: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, positive: change >= 0 }}
            changeLabel="Since launch"
            caption="Bonding curve · ETH settlement"
          />
          <div className="divider" />
          <StatRow
            items={[
              { label: "Price", value: gwei.toPrecision(4), unit: "gwei" },
              { label: "In curve", value: fmtEth(token.realEth), unit: "ETH" },
              { label: "Trades", value: trades.data?.length ?? "–" },
            ]}
          />
          <PriceChart points={points} onRefresh={() => trades.refetch()} emptyText="No trades yet — be the first to buy." />
        </div>

        <div className="card token-trades">
          <h3 className="card-title">Trades</h3>
          {trades.error && <p className="error small">Could not load trades: {(trades.error as Error).message}</p>}
          {recent.length === 0 ? (
            <p className="muted small">No trades yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="trades">
                <thead>
                  <tr><th>Account</th><th>Type</th><th>ETH</th><th>{token.symbol}</th><th>When</th></tr>
                </thead>
                <tbody>
                  {recent.slice(0, 50).map((t) => (
                    <tr key={t.txHash + t.trader + t.tokenAmount}>
                      <td><AddrLink value={t.trader} /></td>
                      <td className={t.isBuy ? "buy" : "sell"}>{t.isBuy ? "Buy" : "Sell"}</td>
                      <td>{fmtEth(t.ethAmount)}</td>
                      <td>{fmtTokens(t.tokenAmount)}</td>
                      <td>
                        {explorerLink("tx", t.txHash) ? (
                          <a href={explorerLink("tx", t.txHash)} target="_blank" rel="noreferrer">{timeAgo(t.timestamp)}</a>
                        ) : (
                          timeAgo(t.timestamp)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      <aside className="token-side">
        <TradePanel token={token} />
        <div className="card">
          <h3 className="card-title">Bonding curve progress</h3>
          <ProgressBar value={token.progress} label={`${(token.progress * 100).toFixed(1)}%`} />
          <p className="muted small">
            {token.migrated
              ? "Graduated! Liquidity was added to the DEX and the LP tokens were burned."
              : token.complete
                ? "Sold out. Liquidity will be migrated to the DEX — anyone can trigger it."
                : `${fmtTokens(token.realToken)} ${token.symbol} left on the curve. When they are sold, all ETH in the curve goes to the DEX as liquidity.`}
          </p>
          {token.complete && !token.migrated && (
            <>
              <button
                className="btn btn-primary btn-block"
                disabled={migrateTx.isBusy}
                onClick={() =>
                  migrateTx.writeContractAsync({ ...launchpad, functionName: "migrate", args: [address] }).catch(() => {})
                }
              >
                {migrateTx.isBusy ? "Migrating…" : "Migrate liquidity to DEX"}
              </button>
              {migrateTx.error && <p className="error small">{migrateTx.error}</p>}
            </>
          )}
          {pair.data && (
            <p className="small">
              DEX pair: <AddrLink value={pair.data} />
            </p>
          )}
        </div>
        {token.description && (
          <div className="card">
            <h3 className="card-title">About</h3>
            <p className="small description">{token.description}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
