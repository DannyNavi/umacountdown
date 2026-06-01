import { useEffect, useState } from "react";
import clocks from "./images/clocks.jpeg"
import sadkita from "./images/sadkita.png"
import helios from "./images/helios.png"


const dates = {
  GrandLive: "2026-07-24T22:00:00Z",
  Maruzensky: "2026-07-01T22:00:00Z",
  DaitakuHelios:"2026-11-01T22:00:00Z"
};

const events = {
  GrandLive: "Grand Live",
  Maruzensky: "Maruzensky and Nakayama Festa",
  DaitakuHelios: "Daitaku Helios"
};

export default function Countdown() {
  const [target, setTarget] = useState("GrandLive");  const [remaining, setRemaining] = useState("");
  const eventDate = new Date(dates[target]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(dates[target]);
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
      {Object.keys(dates).map((name) => (
        <option key={name} value={name}>
          {events[name]}
        </option>
      ))}
    </select>

      <h1>{remaining}</h1>
    <p>
      {events[target]} starts at: {eventDate.toLocaleString()}
    </p>

    {target == "GrandLive" && 
      <div>
        <img src={clocks} height="400px"/>
        <img style={{paddingLeft: "100px"}}  src={sadkita} height="400px"/>
      </div>
    }

    {target == "DaitakuHelios" && 
      <div>
        <img src={helios} height="400px"/>
      </div>
    }

    </div>
  );
}