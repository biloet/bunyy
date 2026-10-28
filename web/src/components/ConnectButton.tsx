import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain } from "../config";
import { fmtEth, shortAddr } from "../lib/format";

export default function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const balance = useBalance({ address, query: { enabled: Boolean(address), refetchInterval: 15_000 } });

  if (!isConnected) {
    const injected = connectors[0];
    return (
      <button
        className="btn"
        disabled={isPending || !injected}
        title={error?.message}
        onClick={() => injected && connect({ connector: injected, chainId: chain.id })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== chain.id) {
    return (
      <button className="btn btn-warn" onClick={() => switchChain({ chainId: chain.id })}>
        Switch to {chain.name}
      </button>
    );
  }

  return (
    <button className="btn" onClick={() => disconnect()} title="Disconnect">
      {balance.data ? `${fmtEth(balance.data.value, 3)} ETH · ` : ""}
      {shortAddr(address!)}
    </button>
  );
}
