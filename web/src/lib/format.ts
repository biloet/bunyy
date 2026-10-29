import { formatEther, formatUnits } from "viem";
import { explorerUrl } from "../config";

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Compact number, e.g. 1.23M. */
export function compact(n: number, digits = 2) {
  if (!isFinite(n)) return "0";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: digits }).format(n);
}

export function fmtEth(wei: bigint, digits = 4) {
  const n = Number(formatEther(wei));
  if (n !== 0 && Math.abs(n) < 10 ** -digits) return n.toExponential(2);
  return n.toLocaleString("en", { maximumFractionDigits: digits });
}

export function fmtTokens(amount: bigint) {
  return compact(Number(formatUnits(amount, 18)));
}

/** Price of 1 whole token in ETH as a readable string. */
export function fmtPrice(virtualEth: bigint, virtualToken: bigint) {
  if (virtualToken === 0n) return "0";
  const p = Number(virtualEth) / Number(virtualToken);
  return p < 0.0001 ? p.toExponential(3) : p.toFixed(6);
}

export function timeAgo(ts: bigint | number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - Number(ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function explorerLink(kind: "address" | "tx", value: string) {
  return explorerUrl ? `${explorerUrl}/${kind}/${value}` : undefined;
}

/** Only allow http(s) and ipfs images; ipfs:// goes through a public gateway. */
export function safeImage(uri: string) {
  const u = uri.trim();
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  if (/^https?:\/\//i.test(u)) return u;
  return "";
}

/** Index level with 2 decimals and thousands separators, e.g. 1,195.61. */
export function fmtLevel(level: number) {
  return level.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(pct: number) {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export function fmtUsd(n: number) {
  if (!isFinite(n)) return "–";
  return n.toLocaleString("en", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 });
}

export function clockUtc(ts: number) {
  return `${new Date(ts * 1000).toISOString().slice(11, 16)} UTC`;
}
