import { useEffect, useState } from "react";
import clocks from "./images/clocks.jpeg"
import sadkita from "./images/sadkita.png"


const dates = {
  GrandLive: "2026-07-24T22:00:00Z",
};

export default function Countdown() {
  const [target, setTarget] = useState(dates.GrandLive);
  const [remaining, setRemaining] = useState("");

  const eventDate = new Date("2026-07-24T22:00:00Z");


  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(target);

      const diff = end - now;

      if (diff <= 0) {
        setRemaining("Grand Live is here!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff / (1000 * 60 * 60)) % 24
      );
      const minutes = Math.floor(
        (diff / (1000 * 60)) % 60
      );
      const seconds = Math.floor(
        (diff / 1000) % 60
      );

      setRemaining(
        `${days}d ${hours}h ${minutes}m ${seconds}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [target]);

  return (
    <div>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      >
        {Object.entries(dates).map(([name, date]) => (
          <option key={name} value={date}>
            {name}
          </option>
        ))}
      </select>

      <h1>{remaining}</h1>
      <p>
        Grand Live starts at: {eventDate.toLocaleString()}
      </p>
      <img src={clocks} height="400px"/>
      <img style={{paddingLeft: "100px"}}  src={sadkita} height="400px"/>
    </div>
  );
}