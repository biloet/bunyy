import { formatEther } from "viem";
import { useParams } from "../hooks/useLaunchpad";
import { compact } from "../lib/format";

export default function Rules() {
  const { data: p } = useParams();
  const n = (v: bigint) => Number(formatEther(v));

  let raise = "";
  let gradCap = "";
  if (p) {
    const [totalSupply, saleSupply, virtualEth, virtualToken] = p.map((x) => BigInt(x));
    const k = n(virtualEth) * n(virtualToken);
    const endEth = k / (n(virtualToken) - n(saleSupply));
    raise = (endEth - n(virtualEth)).toFixed(3);
    gradCap = ((endEth / (n(virtualToken) - n(saleSupply))) * n(totalSupply)).toFixed(2);
  }

  const rules = [
    {
      title: "Fair launch",
      body: `Every token starts with a fixed supply of ${p ? compact(n(p[0])) : "–"}. There is no presale and no team allocation — the creator buys on the curve like everyone else.`,
    },
    {
      title: "Bonding curve",
      body: `${p ? compact(n(p[1])) : "–"} tokens are sold on a constant-product curve with virtual reserves of ${p ? n(p[2]) : "–"} ETH and ${p ? compact(n(p[3])) : "–"} tokens. Each buy raises the price, each sell lowers it. You can sell back to the curve at any time.`,
    },
    {
      title: "Graduation",
      body: `When the sale supply sells out (≈${raise || "–"} ETH raised, ≈${gradCap || "–"} ETH market cap), the ETH and the remaining tokens are added as liquidity on the DEX at the curve's final price. The LP tokens are burned, so the liquidity can never be pulled.`,
    },
    {
      title: "Transfers",
      body: "Until a token graduates it can only be bought from or sold to the curve. Wallet-to-wallet transfers unlock at graduation, so nobody can seed the DEX pool at a bad price first.",
    },
    {
      title: "Fees",
      body: `${p ? p[4] / 100 : "–"}% on every buy and sell. Creating a token costs ${p ? n(p[5]) : "–"} ETH. ${p ? n(p[6]) : "–"} ETH of the raised amount is kept as a migration fee at graduation.`,
    },
    {
      title: "Slippage",
      body: "Every trade sets a minimum amount out. If the price moves past your slippage limit before your transaction is mined, it reverts and you keep your funds.",
    },
    {
      title: "Risk",
      body: "Anyone can launch a token and most launches go to zero. Only trade what you can afford to lose. These contracts have not been audited.",
    },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Rules</h1>
      <div className="list">
        {rules.map((r, i) => (
          <div key={r.title} className="card rule">
            <span className="rule-num">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="card-title">{r.title}</h3>
              <p className="muted">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
