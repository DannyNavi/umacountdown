"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCoord, PIN_LIMITS } from "@/lib/pins";

type PinComposerProps = {
  lat: number;
  lng: number;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (value: { name: string; place: string; note: string }) => void;
};

export function PinComposer({
  lat,
  lng,
  saving,
  error,
  onCancel,
  onSubmit,
}: PinComposerProps) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    onSubmit({ name, place, note });
  }

  const placeInvalid = attempted && place.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[58vh] overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md lg:max-h-[min(32rem,70vh)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl leading-none">Mark your home</h2>
          <p className="mt-2 text-xs tracking-wide text-muted-foreground tabular-nums">
            {formatCoord(lat, lng)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="pin-name">Your name, optional</Label>
          <Input
            id="pin-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={PIN_LIMITS.name}
            autoComplete="off"
            placeholder="Leave blank to stay anonymous"
            disabled={saving}
            className="h-10"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pin-place">Place you live</Label>
          <Input
            id="pin-place"
            name="place"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            maxLength={PIN_LIMITS.place}
            autoComplete="off"
            placeholder="Lisbon"
            disabled={saving}
            aria-invalid={placeInvalid}
            aria-required
            className="h-10"
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pin-note">A line about it, optional</Label>
          <Textarea
            id="pin-note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={PIN_LIMITS.note}
            placeholder="A room above the tram line."
            disabled={saving}
            className="min-h-20 resize-none"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" className="h-10 flex-1" disabled={saving}>
          {saving ? "Saving pin…" : "Drop pin"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
