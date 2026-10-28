import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeEventLog, parseEther } from "viem";
import { useAccount } from "wagmi";
import TokenAvatar from "../components/TokenAvatar";
import { launchpadAbi } from "../abi/Launchpad";
import { launchpad, useParams } from "../hooks/useLaunchpad";
import { useTx } from "../hooks/useTx";
import { chain } from "../config";
import { fmtEth, safeImage } from "../lib/format";
import { AGENT_TYPES, encodeAgentDescription, type AgentType } from "../lib/agent";

export default function Create() {
  const navigate = useNavigate();
  const { address, chainId } = useAccount();
  const params = useParams();
  const tx = useTx();
  const [form, setForm] = useState({ name: "", symbol: "", imageURI: "", description: "", initialBuy: "" });
  const [agentType, setAgentType] = useState<AgentType | "">("Assistant");
  const [formError, setFormError] = useState("");

  const creationFee = params.data?.[5] ?? 0n;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: k === "symbol" ? e.target.value.toUpperCase() : e.target.value });

  useEffect(() => {
    if (!tx.receipt) return;
    for (const log of tx.receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: launchpadAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "TokenCreated") {
          navigate(`/token/${ev.args.token}`);
          return;
        }
      } catch {
        // not a launchpad event
      }
    }
  }, [tx.receipt, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const symbol = form.symbol.trim();
    if (!name || name.length > 32) return setFormError("Agent name must be 1–32 characters.");
    if (!symbol || symbol.length > 10) return setFormError("Ticker must be 1–10 characters.");
    if (form.imageURI && !safeImage(form.imageURI)) return setFormError("Avatar must be an https:// or ipfs:// link.");
    let buy = 0n;
    try {
      buy = form.initialBuy ? parseEther(form.initialBuy) : 0n;
    } catch {
      return setFormError("Invalid initial buy amount.");
    }
    await tx
      .writeContractAsync({
        ...launchpad,
        functionName: "createToken",
        args: [name, symbol, form.imageURI.trim(), encodeAgentDescription(agentType, form.description), 0n],
        value: creationFee + buy,
      })
      .catch(() => {});
  }

  const wrongChain = Boolean(address) && chainId !== chain.id;

  return (
    <div className="create">
      <div>
        <div className="hero-kicker">New agent</div>
        <h1>Deploy an AI agent</h1>
        <p className="muted">Give your agent a name, a persona and a mission. Its token launches on a fair bonding curve.</p>
      </div>
      <form className="card form" onSubmit={submit}>
        <div className="form-preview">
          <TokenAvatar uri={form.imageURI} symbol={form.symbol || "?"} size={96} />
          <div>
            <strong>{form.name || "Agent name"}</strong> <span className="muted">${form.symbol || "TICKER"}</span>
          </div>
        </div>
        <label className="field">
          <span className="field-label">Agent name</span>
          <input value={form.name} onChange={set("name")} maxLength={32} placeholder="Atlas" required />
        </label>
        <label className="field">
          <span className="field-label">Ticker</span>
          <input value={form.symbol} onChange={set("symbol")} maxLength={10} placeholder="ATLAS" required />
        </label>
        <label className="field">
          <span className="field-label">Avatar URL</span>
          <input value={form.imageURI} onChange={set("imageURI")} maxLength={512} placeholder="https://… or ipfs://…" />
        </label>
        <label className="field">
          <span className="field-label">Persona &amp; mission</span>
          <textarea
            value={form.description}
            onChange={set("description")}
            maxLength={980}
            rows={4}
            placeholder="An autonomous research agent that scans on-chain data and posts daily alpha reports."
          />
        </label>
        <div className="field">
          <span className="field-label">Agent type</span>
          <div className="chips">
            {AGENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={agentType === t ? "chip active" : "chip"}
                onClick={() => setAgentType(agentType === t ? "" : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">
            Initial buy (optional, ETH)
            <span className="muted small">Be the first backer of your agent</span>
          </span>
          <input inputMode="decimal" value={form.initialBuy} onChange={set("initialBuy")} placeholder="0.0" />
        </label>
        <p className="muted small">
          Creation fee: {creationFee > 0n ? `${fmtEth(creationFee)} ETH` : "free"}. Agent tokens cannot be
          transferred between wallets until the curve graduates.
        </p>
        {formError && <p className="error small">{formError}</p>}
        {tx.error && <p className="error small">{tx.error}</p>}
        <button className="btn btn-primary btn-block" disabled={!address || wrongChain || tx.isBusy}>
          {!address ? "Connect wallet first" : wrongChain ? `Switch to ${chain.name}` : tx.isBusy ? "Deploying…" : "Deploy agent"}
        </button>
      </form>
    </div>
  );
}
