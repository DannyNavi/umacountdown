import { useMemo, useState } from "react";
import { Search, X, ChevronUp, ChevronDown, ListOrdered } from "lucide-react";

export function ManualBracketBuilder({
  characters = [],
  targetSize = 32,
  onBuild,
  disabled = false,
}) {
  const [search, setSearch] = useState("");
  const [seeds, setSeeds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const selectedIds = useMemo(() => new Set(seeds.map((c) => c.id)), [seeds]);

  const pool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...characters]
      .filter((c) => !selectedIds.has(c.id))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [characters, selectedIds, search]);

  const addChar = (char) => {
    if (seeds.length >= targetSize) return;
    setSeeds((prev) => [...prev, char]);
    setError(null);
    setSuccess(null);
  };

  const removeAt = (idx) => {
    setSeeds((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
    setSuccess(null);
  };

  const move = (idx, dir) => {
    setSeeds((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const fillByName = () => {
    const sorted = [...characters].sort((a, b) => a.name.localeCompare(b.name));
    setSeeds(sorted.slice(0, targetSize));
    setError(null);
    setSuccess(null);
  };

  const clearAll = () => {
    setSeeds([]);
    setError(null);
    setSuccess(null);
  };

  const handleBuild = async () => {
    if (seeds.length !== targetSize) {
      setError(`Pick exactly ${targetSize} characters (seed 1 = highest).`);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await onBuild(seeds.map((c) => c.id), targetSize);
      if (result?.success === false) {
        setError(result.error || "Failed to build bracket");
      } else {
        setSuccess(`Bracket built — #1 plays #${targetSize}, #2 plays #${targetSize - 1}, etc.`);
      }
    } catch (err) {
      setError(err?.message || "Failed to build bracket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-emerald-400" />
          Manual Bracket Builder
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Pick Top {targetSize} in seed order (#1 = strongest). Round 1 and every later
          round pair highest remaining vs lowest remaining.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={fillByName}
          disabled={disabled || busy}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-semibold"
        >
          Autofill A–Z (first {targetSize})
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || busy || seeds.length === 0}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-semibold"
        >
          Clear
        </button>
        <span className="ml-auto text-[11px] font-mono text-slate-400 self-center">
          {seeds.length}/{targetSize}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2 min-h-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roster…"
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
            {pool.length === 0 ? (
              <p className="p-3 text-[11px] text-slate-500 italic">No matches</p>
            ) : (
              pool.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  disabled={disabled || busy || seeds.length >= targetSize}
                  onClick={() => addChar(char)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-800/80 disabled:opacity-40"
                >
                  <img
                    src={char.avatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-md object-cover bg-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs text-slate-200 font-semibold truncate">
                    {char.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
          {Array.from({ length: targetSize }, (_, i) => {
            const char = seeds[i];
            return (
              <div
                key={`seed-${i}`}
                className="flex items-center gap-2 px-2 py-1.5 min-h-[2.5rem]"
              >
                <span className="w-6 text-[10px] font-black text-emerald-400/90 shrink-0">
                  #{i + 1}
                </span>
                {char ? (
                  <>
                    <img
                      src={char.avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded object-cover bg-slate-800 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[11px] text-white font-semibold truncate flex-1">
                      {char.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === seeds.length - 1 || busy}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      disabled={busy}
                      className="p-0.5 text-slate-500 hover:text-rose-400"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-600 italic">Empty slot</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-medium">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-300 font-medium">{success}</p>
      )}

      <button
        type="button"
        onClick={handleBuild}
        disabled={disabled || busy || seeds.length !== targetSize}
        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-md active:scale-95"
      >
        {busy ? "Building…" : `Build ${targetSize}-Player Bracket`}
      </button>
    </div>
  );
}
