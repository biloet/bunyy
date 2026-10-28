import { useState } from "react";
import { safeImage } from "../lib/format";

export default function TokenAvatar({ uri, symbol, size = 64 }: { uri: string; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = safeImage(uri);
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (!src || failed) {
    return (
      <div className="avatar avatar-fallback" style={style}>
        <span>{symbol.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      className="avatar"
      style={style}
      src={src}
      alt={symbol}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
