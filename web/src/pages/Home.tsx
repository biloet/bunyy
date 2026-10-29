import Composition from "../components/Composition";
import IndexCard from "../components/IndexCard";
import IndexPicker from "../components/IndexPicker";
import Logo from "../components/Logo";
import { useSelectedIndex } from "../hooks/useSelectedIndex";
import { useIndexes, useVaultState } from "../hooks/useVault";

export default function Home() {
  const indexes = useIndexes();
  const vaultState = useVaultState();
  const { selected, select } = useSelectedIndex(indexes.data);

  return (
    <>
      <section className="hero">
        <Logo size={88} />
        <div>
          <h1 className="hero-title">{selected?.name ?? "dibVarse"}</h1>
          <p className="hero-sub">{selected?.description || "AI leaders. One index."}</p>
        </div>
      </section>

      {indexes.data && <IndexPicker indexes={indexes.data} selected={selected} onSelect={select} />}
      {indexes.error && <p className="error">Could not load the index: {(indexes.error as Error).message}</p>}
      {indexes.isLoading && <div className="card panel muted">Loading index…</div>}
      {indexes.data?.length === 0 && <div className="card empty">No index has been created yet.</div>}

      {selected && (
        <div className="stack">
          <IndexCard index={selected} vaultState={vaultState.data} />
          <Composition index={selected} />
        </div>
      )}
    </>
  );
}
