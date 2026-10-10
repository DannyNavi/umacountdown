import { useState } from "react";
import { PIN_LIMITS } from "./pins.js";

export default function PinComposer({ saving, error, onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setAttempted(true);
    onSubmit({ name, place, note });
  }

  const placeInvalid = attempted && place.trim().length === 0;

  return (
    <form className="ExileWorld-composer" onSubmit={handleSubmit}>
      <label>
        Your name, optional
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={PIN_LIMITS.name}
          autoComplete="off"
          placeholder="Leave blank to stay anonymous"
          disabled={saving}
        />
      </label>

      <label>
        Place you live
        <input
          name="place"
          value={place}
          onChange={(event) => setPlace(event.target.value)}
          maxLength={PIN_LIMITS.place}
          autoComplete="off"
          placeholder="Lisbon"
          disabled={saving}
          aria-invalid={placeInvalid}
          aria-required
          autoFocus
        />
      </label>

      <label>
        A line about it, optional
        <textarea
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={PIN_LIMITS.note}
          placeholder="A room above the tram line."
          disabled={saving}
        />
      </label>

      {error ? (
        <p role="alert" className="ExileWorld-formError">
          {error}
        </p>
      ) : null}

      <div className="ExileWorld-composerActions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving pin…" : "Drop pin"}
        </button>
        <button type="button" className="is-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
