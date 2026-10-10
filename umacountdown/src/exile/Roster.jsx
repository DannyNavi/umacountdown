import { displayName, formatCoord, formatWhen, homeCount } from "./pins.js";

export default function Roster({ pins, selectedId, syncError, onSelect }) {
  return (
    <section className="ExileWorld-roster">
      <header className="ExileWorld-rosterHead">
        <h2>Homes</h2>
        <p aria-live="polite">{homeCount(pins.length)}</p>
      </header>

      {syncError ? (
        <p role="status" className="ExileWorld-syncError">
          The latest homes could not be loaded. This is the last map we have.
        </p>
      ) : null}

      <div className="ExileWorld-rosterList">
        {pins.length === 0 ? (
          <div className="ExileWorld-empty">
            <p className="ExileWorld-emptyTitle">The atlas is still blank.</p>
            <p>
              Click anywhere on the map to mark where you live. The pin is saved
              on the server, so the next person sees it too.
            </p>
          </div>
        ) : (
          <ul>
            {pins.map((pin) => {
              const selected = pin.id === selectedId;
              return (
                <li key={pin.id}>
                  <button
                    type="button"
                    id={`home-${pin.id}`}
                    onClick={() => onSelect(pin.id)}
                    aria-pressed={selected}
                    className={selected ? "is-selected" : ""}
                  >
                    <span className="ExileWorld-pinPlace">{pin.place}</span>
                    <span className={pin.name ? "ExileWorld-pinName" : "ExileWorld-pinAnon"}>
                      {displayName(pin)}
                    </span>
                    {pin.note ? <span className="ExileWorld-pinNote">{pin.note}</span> : null}
                    <span className="ExileWorld-pinMeta">
                      {formatCoord(pin.lat, pin.lng)}
                      {formatWhen(pin.createdAt) ? ` · ${formatWhen(pin.createdAt)}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer>
        Pins are stored on the server, so every visitor shares this map.
        Coastlines from Natural Earth.
      </footer>
    </section>
  );
}
