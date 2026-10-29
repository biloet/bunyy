import { useSearchParams } from "react-router-dom";
import type { IndexView } from "./useVault";

/** The index chosen via ?index=N, defaulting to the first one. */
export function useSelectedIndex(indexes: IndexView[] | undefined) {
  const [params, setParams] = useSearchParams();
  const wanted = Number(params.get("index") ?? 0);
  const selected = indexes?.find((i) => i.id === wanted) ?? indexes?.[0];
  const select = (id: number) =>
    setParams((p) => {
      p.set("index", String(id));
      return p;
    });
  return { selected, select };
}
