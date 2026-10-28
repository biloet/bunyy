import { Link } from "react-router-dom";
import type { TokenInfo } from "../hooks/useLaunchpad";
import { compact, timeAgo } from "../lib/format";
import { parseAgentDescription } from "../lib/agent";
import ProgressBar from "./ProgressBar";
import TokenAvatar from "./TokenAvatar";

export default function TokenCard({ token }: { token: TokenInfo }) {
  const { type, persona } = parseAgentDescription(token.description);
  return (
    <Link to={`/token/${token.address}`} className="card token-card">
      <TokenAvatar uri={token.imageURI} symbol={token.symbol} size={56} />
      <div className="token-card-body">
        <div className="token-card-top">
          <div className="token-card-title">
            <strong>{token.name}</strong> <span className="muted">{token.symbol}</span>
          </div>
          {token.migrated ? (
            <span className="tag tag-good">Graduated</span>
          ) : token.complete ? (
            <span className="tag">Migrating</span>
          ) : (
            <span className="muted small">{timeAgo(token.createdAt)}</span>
          )}
        </div>
        <div className="agent-meta">
          {type && <span className="tag tag-type">{type}</span>}
          {persona && <span className="muted small agent-persona">{persona}</span>}
        </div>
        <div className="token-card-mid">
          <span className="muted small">Market cap</span>
          <span className="mono">
            {compact(token.marketCapEth, 3)} <span className="muted">ETH</span>
          </span>
        </div>
        <ProgressBar value={token.progress} />
        <div className="muted small">{(token.progress * 100).toFixed(1)}% bonded</div>
      </div>
    </Link>
  );
}
