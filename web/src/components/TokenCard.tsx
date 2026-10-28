import { Link } from "react-router-dom";
import type { TokenInfo } from "../hooks/useLaunchpad";
import { compact, shortAddr, timeAgo } from "../lib/format";
import ProgressBar from "./ProgressBar";
import TokenAvatar from "./TokenAvatar";

export default function TokenCard({ token }: { token: TokenInfo }) {
  return (
    <Link to={`/token/${token.address}`} className="card token-card">
      <TokenAvatar uri={token.imageURI} symbol={token.symbol} size={80} />
      <div className="token-card-body">
        <div className="token-card-title">
          <strong>{token.name}</strong> <span className="muted">${token.symbol}</span>
        </div>
        <div className="muted small">
          by {shortAddr(token.creator)} · {timeAgo(token.createdAt)}
        </div>
        <div className="small">
          Market cap: <span className="accent">{compact(token.marketCapEth, 3)} ETH</span>
          {token.migrated ? <span className="badge">graduated</span> : token.complete ? <span className="badge">completing</span> : null}
        </div>
        {token.description && <p className="token-card-desc small">{token.description}</p>}
        <ProgressBar value={token.progress} />
      </div>
    </Link>
  );
}
