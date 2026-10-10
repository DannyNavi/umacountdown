"use client";

import { displayName, formatCoord, formatWhen, homeCount, type Pin } from "@/lib/pins";
import { cn } from "@/lib/utils";

type RosterProps = {
  pins: Pin[];
  selectedId: string | null;
  syncError: boolean;
  onSelect: (id: string) => void;
};

export function Roster({ pins, selectedId, syncError, onSelect }: RosterProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
      <header className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className="font-heading text-2xl">Homes</h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {homeCount(pins.length)}
        </p>
      </header>

      {syncError ? (
        <p role="status" className="px-4 pb-2 text-sm text-destructive">
          The latest homes could not be loaded. This is the last map we have.
        </p>
      ) : null}

      <div className="roster-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {pins.length === 0 ? (
          <div className="flex h-full min-h-36 flex-col justify-center px-3 py-6">
            <p className="font-heading text-xl">The atlas is still blank.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Click anywhere on the map to mark where you live. The pin is
              saved on the server, so the next person sees it too.
            </p>
          </div>
        ) : (
          <ul className="grid gap-1">
            {pins.map((pin) => {
              const selected = pin.id === selectedId;
              return (
                <li key={pin.id}>
                  <button
                    type="button"
                    id={`home-${pin.id}`}
                    onClick={() => onSelect(pin.id)}
                    aria-pressed={selected}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-accent ring-1 ring-primary/70"
                        : "hover:bg-accent/70",
                    )}
                  >
                    <span className="block font-heading text-lg leading-tight">
                      {pin.place}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-sm",
                        pin.name ? "text-foreground/90" : "text-muted-foreground",
                      )}
                    >
                      {displayName(pin)}
                    </span>
                    {pin.note ? (
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                        {pin.note}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block text-[11px] tracking-wide text-muted-foreground tabular-nums">
                      {formatCoord(pin.lat, pin.lng)}
                      {formatWhen(pin.createdAt)
                        ? ` · ${formatWhen(pin.createdAt)}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-border px-4 py-2.5 text-[11px] leading-4 text-muted-foreground">
        Pins are stored on the server, so every visitor shares this map.
        Coastlines from Natural Earth.
      </footer>
    </section>
  );
}
