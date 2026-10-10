import { useState } from "react";
import { PIN_LIMITS } from "./pins.js";

export default function PinComposer({ saving, error, onCancel, onSubmit }) {
  const [name, setName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ name, place: "", note: "" });
  }

  return (
    <form className="ExileWorld-composer" onSubmit={handleSubmit}>
      <label>
        Name
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={PIN_LIMITS.name}
          autoComplete="off"
          placeholder="Leave blank to stay anonymous"
          disabled={saving}
          autoFocus
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
