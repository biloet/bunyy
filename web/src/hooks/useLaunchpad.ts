import { useQuery } from "@tanstack/react-query";
import { erc20Abi, getAbiItem, type Address } from "viem";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { launchpadAbi } from "../abi/Launchpad";
import { FROM_BLOCK, LAUNCHPAD_ADDRESS } from "../config";

const launchpad = { address: LAUNCHPAD_ADDRESS as Address, abi: launchpadAbi } as const;
const enabled = Boolean(LAUNCHPAD_ADDRESS);

export type TokenInfo = {
  address: Address;
  name: string;
  symbol: string;
  creator: Address;
  virtualEth: bigint;
  virtualToken: bigint;
  realEth: bigint;
  realToken: bigint;
  complete: boolean;
  migrated: boolean;
  createdAt: bigint;
  imageURI: string;
  description: string;
  /** Sold share of the sale supply, 0..1 */
  progress: number;
  /** Market cap in ETH (price × total supply) */
  marketCapEth: number;
};

export function useParams() {
  return useReadContract({ ...launchpad, functionName: "params", query: { enabled, staleTime: 60_000 } });
}

export function useTokens(limit = 100) {
  const params = useParams();
  const list = useReadContract({
    ...launchpad,
    functionName: "getTokens",
    args: [0n, BigInt(limit)],
    query: { enabled, refetchInterval: 15_000 },
  });
  const addresses = list.data ?? [];
  const details = useTokenDetails(addresses, params.data);
  return {
    tokens: details.data,
    isLoading: list.isLoading || details.isLoading,
    error: list.error || details.error,
    refetch: () => Promise.all([list.refetch(), details.refetch()]),
  };
}

export function useToken(address: Address) {
  const params = useParams();
  const details = useTokenDetails([address], params.data, 8_000);
  return { token: details.data?.[0], isLoading: details.isLoading, error: details.error, refetch: details.refetch };
}

type ParamsTuple = readonly [bigint, bigint, bigint, bigint, number, bigint, bigint];

function useTokenDetails(addresses: readonly Address[], params: ParamsTuple | undefined, refetchInterval = 15_000) {
  const contracts = addresses.flatMap((address) => [
    { ...launchpad, functionName: "getCurve", args: [address] } as const,
    { address, abi: erc20Abi, functionName: "name" } as const,
    { address, abi: erc20Abi, functionName: "symbol" } as const,
  ]);
  const res = useReadContracts({
    contracts,
    allowFailure: false,
    query: { enabled: enabled && addresses.length > 0 && Boolean(params), refetchInterval },
  });

  let data: TokenInfo[] | undefined;
  if (res.data && params) {
    const [totalSupply, saleSupply] = params;
    data = addresses.map((address, i) => {
      const curve = res.data[i * 3] as {
        creator: Address;
        virtualEth: bigint;
        virtualToken: bigint;
        realEth: bigint;
        realToken: bigint;
        complete: boolean;
        migrated: boolean;
        createdAt: bigint;
        imageURI: string;
        description: string;
      };
      const sold = saleSupply > curve.realToken ? saleSupply - curve.realToken : 0n;
      return {
        address,
        name: res.data[i * 3 + 1] as string,
        symbol: res.data[i * 3 + 2] as string,
        ...curve,
        progress: Number((sold * 10_000n) / saleSupply) / 10_000,
        marketCapEth: (Number(curve.virtualEth) / Number(curve.virtualToken)) * (Number(totalSupply) / 1e18),
      };
    });
  } else if (addresses.length === 0 && params) {
    data = [];
  }
  return { ...res, data };
}

const tradeEvent = getAbiItem({ abi: launchpadAbi, name: "Trade" });

export type TradeLog = {
  token: Address;
  trader: Address;
  isBuy: boolean;
  ethAmount: bigint;
  tokenAmount: bigint;
  virtualEth: bigint;
  virtualToken: bigint;
  timestamp: bigint;
  txHash: `0x${string}`;
};

/** Trade events for one token, or for the whole launchpad when `token` is omitted. Oldest first. */
export function useTrades(token?: Address) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["trades", token ?? "all"],
    enabled: enabled && Boolean(client),
    refetchInterval: 8_000,
    queryFn: async (): Promise<TradeLog[]> => {
      const logs = await client!.getLogs({
        address: LAUNCHPAD_ADDRESS as Address,
        event: tradeEvent,
        args: token ? { token } : undefined,
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });
      return logs.map((l) => ({
        token: l.args.token!,
        trader: l.args.trader!,
        isBuy: l.args.isBuy!,
        ethAmount: l.args.ethAmount!,
        tokenAmount: l.args.tokenAmount!,
        virtualEth: l.args.virtualEth!,
        virtualToken: l.args.virtualToken!,
        timestamp: l.args.timestamp!,
        txHash: l.transactionHash!,
      }));
    },
  });
}

const migratedEvent = getAbiItem({ abi: launchpadAbi, name: "Migrated" });

export function usePair(token: Address, migrated: boolean) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["pair", token],
    enabled: enabled && migrated && Boolean(client),
    staleTime: Infinity,
    queryFn: async () => {
      const logs = await client!.getLogs({
        address: LAUNCHPAD_ADDRESS as Address,
        event: migratedEvent,
        args: { token },
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });
      return logs[0]?.args.pair ?? null;
    },
  });
}

/** The connected wallet's balance of each token. */
export function useBalances(tokens: readonly Address[], owner?: Address) {
  return useReadContracts({
    contracts: tokens.map((address) => ({ address, abi: erc20Abi, functionName: "balanceOf", args: [owner!] }) as const),
    allowFailure: false,
    query: { enabled: Boolean(owner) && tokens.length > 0, refetchInterval: 10_000 },
  });
}

export { launchpad };
