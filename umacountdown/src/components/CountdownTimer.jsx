import { useEffect, useState } from "react";

const SENTINEL_END_MS = 2147483647 * 1000;

function formatRemaining(diff) {
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function hasUsableEnd(endMs) {
  return Number.isFinite(endMs) && endMs > 0 && endMs < SENTINEL_END_MS;
}

function CountdownTimer({ startDate, endDate }) {
  const [remaining, setRemaining] = useState("");
  const [phaseLabel, setPhaseLabel] = useState("Banner starts:");
  const [displayDate, setDisplayDate] = useState(startDate);

  useEffect(() => {
    if (!startDate) return;

    const updateTimer = () => {
      const now = Date.now();
      const startMs = new Date(startDate).getTime();
      const endMs = endDate != null ? new Date(endDate).getTime() : NaN;

      if (now < startMs) {
        setRemaining(formatRemaining(startMs - now));
        setPhaseLabel("Banner starts:");
        setDisplayDate(startMs);
        return;
      }

      if (hasUsableEnd(endMs) && now < endMs) {
        setRemaining(formatRemaining(endMs - now));
        setPhaseLabel("Banner ends:");
        setDisplayDate(endMs);
        return;
      }

      setRemaining("This banner has ended");
      setPhaseLabel(hasUsableEnd(endMs) ? "Banner ended:" : "Banner started:");
      setDisplayDate(hasUsableEnd(endMs) ? endMs : startMs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  if (!startDate) return null;

  return (
    <div className="countdown">
      <h1>{remaining}</h1>
      <p>
        {phaseLabel} {new Date(displayDate).toLocaleString()}
      </p>
    </div>
  );
}

export default CountdownTimer;
