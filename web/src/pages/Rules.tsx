import { useVaultState } from "../hooks/useVault";
import { fmtEth } from "../lib/format";

function duration(seconds: number) {
  if (seconds % 86400 === 0) return `${seconds / 86400} day${seconds === 86400 ? "" : "s"}`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour${seconds === 3600 ? "" : "s"}`;
  return `${Math.round(seconds / 60)} minutes`;
}

export default function Rules() {
  const { data: v } = useVaultState();
  const x = v ? `${v.maxPayoutBps / 10_000}×` : "–";

  const rules = [
    {
      title: "What the index tracks",
      body: "Each index is a weighted basket of assets priced by oracles. It launched at 1,000 and moves with the weighted return of its components since launch: if every asset rises 10%, the index reads 1,100.",
    },
    {
      title: "ETH settlement",
      body: "You deposit ETH and get ETH back. Your position's value is principal × exit level ÷ entry level, so it follows the index's percentage move, measured in ETH.",
    },
    {
      title: "Payout cap",
      body: `A position pays at most ${x} its principal. This keeps the vault able to settle every open position at once.`,
    },
    {
      title: "Reserves",
      body: `The vault's ETH reserves are the counterparty: they pay gains and receive losses and fees. Every open position locks enough reserves to cover its maximum payout. "Effective reserves" is what remains for new positions (now ${v ? fmtEth(v.effectiveReserves, 5) : "–"} ETH).`,
    },
    {
      title: "Wallet principal limit",
      body: `Each wallet can have up to ${v ? fmtEth(v.walletPrincipalLimit, 4) : "–"} ETH of open principal per index. The minimum position is ${v ? fmtEth(v.minPrincipal, 4) : "–"} ETH.`,
    },
    {
      title: "Fees",
      body: `${v ? v.feeBps / 100 : "–"}% when opening (on principal) and ${v ? v.feeBps / 100 : "–"}% when closing (on payout). Fees go to the reserves.`,
    },
    {
      title: "Valid price",
      body: `Opening and closing need every component price to be fresh (updated within ${v ? duration(v.maxPriceAge) : "–"}). When any price is stale the index shows "Stale price" and trading pauses. If prices stay stale for ${v ? duration(v.emergencyDelay) : "–"}, you can take your principal back with an emergency refund.`,
    },
    {
      title: "Risk",
      body: "You can lose part or all of your deposit if the index falls. Testnet indexes use simulated prices. Tokenized stocks are regulated securities in many countries — check that you are allowed to use this product. The contracts have not been audited.",
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
