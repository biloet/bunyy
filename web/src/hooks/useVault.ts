import { useQuery } from "@tanstack/react-query";
import { formatEther, getAbiItem, type Address } from "viem";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { indexVaultAbi } from "../abi/IndexVault";
import { mockPriceFeedAbi } from "../abi/MockPriceFeed";
import { FROM_BLOCK, VAULT_ADDRESS } from "../config";

export const vault = { address: VAULT_ADDRESS as Address, abi: indexVaultAbi } as const;
const enabled = Boolean(VAULT_ADDRESS);

export type VaultState = {
  feeBps: number;
  maxPayoutBps: number;
  minPrincipal: bigint;
  walletPrincipalLimit: bigint;
  maxPriceAge: number;
  emergencyDelay: number;
  reserves: bigint;
  effectiveReserves: bigint;
  totalOpenInterest: bigint;
  maxOpenPrincipal: bigint;
};

export function useVaultState() {
  const res = useReadContracts({
    contracts: [
      { ...vault, functionName: "params" },
      { ...vault, functionName: "reserves" },
      { ...vault, functionName: "effectiveReserves" },
      { ...vault, functionName: "totalOpenInterest" },
      { ...vault, functionName: "maxOpenPrincipal" },
    ],
    allowFailure: false,
    query: { enabled, refetchInterval: 15_000 },
  });
  let data: VaultState | undefined;
  if (res.data) {
    const [p, reserves, effectiveReserves, totalOpenInterest, maxOpenPrincipal] = res.data;
    const [feeBps, maxPayoutBps, minPrincipal, walletPrincipalLimit, maxPriceAge, emergencyDelay] = p;
    data = {
      feeBps,
      maxPayoutBps,
      minPrincipal,
      walletPrincipalLimit,
      maxPriceAge,
      emergencyDelay,
      reserves,
      effectiveReserves,
      totalOpenInterest,
      maxOpenPrincipal,
    };
  }
  return { ...res, data };
}

export type ComponentView = {
  feed: Address;
  weightBps: number;
  label: string;
  decimals: number;
  basePrice: number;
  price: number;
  updatedAt: number;
};

export type IndexView = {
  id: number;
  name: string;
  symbol: string;
  description: string;
  launchedAt: number;
  active: boolean;
  openInterest: bigint;
  levelRaw: bigint;
  level: number;
  valid: boolean;
  oldestUpdate: number;
  components: ComponentView[];
};

export function useIndexes() {
  const count = useReadContract({ ...vault, functionName: "indexCount", query: { enabled, staleTime: 60_000 } });
  const ids = Array.from({ length: Number(count.data ?? 0n) }, (_, i) => BigInt(i));

  const base = useReadContracts({
    contracts: ids.flatMap((id) => [
      { ...vault, functionName: "getIndex", args: [id] } as const,
      { ...vault, functionName: "indexLevel", args: [id] } as const,
    ]),
    allowFailure: false,
    query: { enabled: ids.length > 0, refetchInterval: 10_000 },
  });

  const feeds = base.data
    ? ids.flatMap((_, i) => (base.data[i * 2] as readonly [unknown, readonly { feed: Address }[]])[1].map((c) => c.feed))
    : [];
  const feedReads = useReadContracts({
    contracts: feeds.flatMap((address) => [
      { address, abi: mockPriceFeedAbi, functionName: "description" } as const,
      { address, abi: mockPriceFeedAbi, functionName: "decimals" } as const,
      { address, abi: mockPriceFeedAbi, functionName: "latestRoundData" } as const,
    ]),
    allowFailure: true,
    query: { enabled: feeds.length > 0, refetchInterval: 10_000 },
  });

  let data: IndexView[] | undefined;
  if (count.data === 0n) data = [];
  if (base.data && feedReads.data) {
    let f = 0;
    data = ids.map((id, i) => {
      const [info, comps] = base.data[i * 2] as readonly [
        { name: string; symbol: string; description: string; launchedAt: bigint; active: boolean; openInterest: bigint },
        readonly { feed: Address; weightBps: number; basePrice: bigint }[],
      ];
      const [levelRaw, valid, oldest] = base.data[i * 2 + 1] as readonly [bigint, boolean, bigint];
      const components = comps.map((c) => {
        const desc = feedReads.data![f * 3]?.result as string | undefined;
        const dec = Number((feedReads.data![f * 3 + 1]?.result as number | undefined) ?? 8);
        const round = feedReads.data![f * 3 + 2]?.result as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
        f++;
        return {
          feed: c.feed,
          weightBps: c.weightBps,
          label: (desc ?? "").replace(/\s*\/\s*USD$/i, "") || `${c.feed.slice(0, 6)}…`,
          decimals: dec,
          basePrice: Number(c.basePrice) / 10 ** dec,
          price: round ? Number(round[1]) / 10 ** dec : NaN,
          updatedAt: round ? Number(round[3]) : 0,
        };
      });
      return {
        id: Number(id),
        name: info.name,
        symbol: info.symbol,
        description: info.description,
        launchedAt: Number(info.launchedAt),
        active: info.active,
        openInterest: info.openInterest,
        levelRaw,
        level: Number(formatEther(levelRaw)),
        valid,
        oldestUpdate: Number(oldest),
        components,
      };
    });
  }
  return {
    data,
    isLoading: count.isLoading || base.isLoading || feedReads.isLoading,
    error: count.error || base.error || feedReads.error,
    refetch: () => Promise.all([base.refetch(), feedReads.refetch()]),
  };
}

const checkpointEvent = getAbiItem({ abi: indexVaultAbi, name: "LevelCheckpoint" });

/** Index level history from on-chain checkpoints, oldest first. */
export function useLevelHistory(indexId: number | undefined) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["levels", indexId],
    enabled: enabled && Boolean(client) && indexId !== undefined,
    refetchInterval: 15_000,
    queryFn: async () => {
      const logs = await client!.getLogs({
        address: VAULT_ADDRESS as Address,
        event: checkpointEvent,
        args: { indexId: BigInt(indexId!) },
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });
      return logs.map((l) => ({ t: Number(l.args.timestamp!), v: Number(formatEther(l.args.level!)) }));
    },
  });
}

export type PositionView = {
  id: bigint;
  owner: Address;
  indexId: number;
  open: boolean;
  openedAt: number;
  principal: bigint;
  entryLevel: bigint;
  quote: bigint; // payout if closed now (0 if closed or prices stale)
};

export function usePositions(owner?: Address) {
  const ids = useReadContract({
    ...vault,
    functionName: "positionsOf",
    args: [owner!],
    query: { enabled: enabled && Boolean(owner), refetchInterval: 10_000 },
  });
  const list = ids.data ?? [];
  const reads = useReadContracts({
    contracts: list.flatMap((id) => [
      { ...vault, functionName: "getPosition", args: [id] } as const,
      { ...vault, functionName: "quoteClose", args: [id] } as const,
    ]),
    allowFailure: false,
    query: { enabled: list.length > 0, refetchInterval: 10_000 },
  });
  let data: PositionView[] | undefined;
  if (ids.data && ids.data.length === 0) data = [];
  if (reads.data) {
    data = list
      .map((id, i) => {
        const p = reads.data[i * 2] as {
          owner: Address;
          indexId: number;
          open: boolean;
          openedAt: bigint;
          principal: bigint;
          entryLevel: bigint;
        };
        const [quote] = reads.data[i * 2 + 1] as readonly [bigint, bigint, bigint];
        return { id, ...p, openedAt: Number(p.openedAt), quote };
      })
      .reverse();
  }
  return { data, isLoading: ids.isLoading || reads.isLoading, refetch: () => Promise.all([ids.refetch(), reads.refetch()]) };
}

const openedEvent = getAbiItem({ abi: indexVaultAbi, name: "PositionOpened" });
const closedEvent = getAbiItem({ abi: indexVaultAbi, name: "PositionClosed" });
const refundEvent = getAbiItem({ abi: indexVaultAbi, name: "EmergencyRefund" });

export type ActivityItem = {
  kind: "open" | "close" | "refund";
  positionId: bigint;
  owner: Address;
  indexId?: number;
  amount: bigint; // principal on open/refund, payout on close
  principal: bigint;
  level?: bigint;
  timestamp?: number;
  block: bigint;
  txHash: `0x${string}`;
};

/** All vault activity, newest first. */
export function useActivity() {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["activity"],
    enabled: enabled && Boolean(client),
    refetchInterval: 10_000,
    queryFn: async (): Promise<ActivityItem[]> => {
      const range = { address: VAULT_ADDRESS as Address, fromBlock: FROM_BLOCK, toBlock: "latest" as const };
      const [opened, closed, refunds] = await Promise.all([
        client!.getLogs({ ...range, event: openedEvent }),
        client!.getLogs({ ...range, event: closedEvent }),
        client!.getLogs({ ...range, event: refundEvent }),
      ]);
      const items: ActivityItem[] = [
        ...opened.map((l) => ({
          kind: "open" as const,
          positionId: l.args.positionId!,
          owner: l.args.owner!,
          indexId: Number(l.args.indexId!),
          amount: l.args.principal!,
          principal: l.args.principal!,
          level: l.args.entryLevel!,
          timestamp: Number(l.args.timestamp!),
          block: l.blockNumber!,
          txHash: l.transactionHash!,
        })),
        ...closed.map((l) => ({
          kind: "close" as const,
          positionId: l.args.positionId!,
          owner: l.args.owner!,
          indexId: Number(l.args.indexId!),
          amount: l.args.payout!,
          principal: l.args.principal!,
          level: l.args.exitLevel!,
          timestamp: Number(l.args.timestamp!),
          block: l.blockNumber!,
          txHash: l.transactionHash!,
        })),
        ...refunds.map((l) => ({
          kind: "refund" as const,
          positionId: l.args.positionId!,
          owner: l.args.owner!,
          amount: l.args.principal!,
          principal: l.args.principal!,
          block: l.blockNumber!,
          txHash: l.transactionHash!,
        })),
      ];
      return items.sort((a, b) => Number(b.block - a.block));
    },
  });
}
