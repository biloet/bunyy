import type { IndexView } from "../hooks/useVault";

/** Segmented picker shown only when the vault has more than one index. */
export default function IndexPicker({
  indexes,
  selected,
  onSelect,
}: {
  indexes: IndexView[];
  selected?: IndexView;
  onSelect: (id: number) => void;
}) {
  if (indexes.length < 2) return null;
  return (
    <div className="segmented index-picker">
      {indexes.map((i) => (
        <button key={i.id} className={selected?.id === i.id ? "seg active" : "seg"} onClick={() => onSelect(i.id)}>
          {i.symbol}
        </button>
      ))}
    </div>
  );
}
