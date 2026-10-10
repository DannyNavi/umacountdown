import { useMemo } from "react";
import "./ExileWorld.css";

// Same Cloudflare account as the Uma Countdown worker.
const EXILE_WORLD_ORIGIN =
  import.meta.env.VITE_EXILE_WORLD_ORIGIN ||
  "https://exile-world.nguyen-danny142.workers.dev";

export default function ExileWorld() {
  const src = useMemo(() => EXILE_WORLD_ORIGIN.replace(/\/$/, ""), []);

  return (
    <div className="ExileWorld-Container">
      <iframe
        className="ExileWorld-frame"
        title="Exile World shared atlas"
        src={src}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
