import { defineChain, type Address } from "viem";
import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

const env = import.meta.env;
const chainKind = (env.VITE_CHAIN || "testnet") as "testnet" | "mainnet" | "local";

const presets = {
  testnet: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    // Official public endpoint: rate-limited, fine to start with. Set VITE_RPC_URL for production traffic.
    rpc: "https://rpc.testnet.chain.robinhood.com",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    testnet: true,
  },
  mainnet: {
    id: 4663,
    name: "Robinhood Chain",
    rpc: "",
    explorer: "",
    testnet: false,
  },
  local: {
    id: 31337,
    name: "Hardhat Local",
    rpc: "http://127.0.0.1:8545",
    explorer: "",
    testnet: true,
  },
}[chainKind];

const rpcUrl = env.VITE_RPC_URL || presets.rpc;
export const explorerUrl: string = (env.VITE_EXPLORER_URL || presets.explorer).replace(/\/$/, "");

export const chain = defineChain({
  id: presets.id,
  name: presets.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: rpcUrl ? [rpcUrl] : [] } },
  blockExplorers: explorerUrl ? { default: { name: "Explorer", url: explorerUrl } } : undefined,
  testnet: presets.testnet,
});

export const LAUNCHPAD_ADDRESS = (env.VITE_LAUNCHPAD_ADDRESS || "") as Address | "";
export const FROM_BLOCK = BigInt(env.VITE_LAUNCHPAD_FROM_BLOCK || "0");
export const missingEnv = [
  !rpcUrl && "VITE_RPC_URL",
  !LAUNCHPAD_ADDRESS && "VITE_LAUNCHPAD_ADDRESS",
].filter(Boolean) as string[];
export const isConfigured = missingEnv.length === 0;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(rpcUrl || undefined) },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
