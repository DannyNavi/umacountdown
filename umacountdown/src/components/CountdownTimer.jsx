import { useEffect, useState } from "react";

function CountdownTimer({ targetDate, eventName }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetDate) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(targetDate);
      const diff = end - now;

      if (diff <= 0) {
        setRemaining(`The wait is over!`);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setRemaining(
        `${days}d ${hours}h ${minutes}m ${seconds}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, eventName]);

  return (
    <div className="countdown">
      <h1>{remaining}</h1>
      <p>Starts: {new Date(targetDate).toLocaleString()}</p>
    </div>
  );
}

export default CountdownTimer;