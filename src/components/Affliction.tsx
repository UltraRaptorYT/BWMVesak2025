import { useState } from "react";

export function Affliction() {
  const [randomX, setRandomX] = useState(Math.floor(Math.random() * 91));
  const [randomY, setRandomY] = useState(Math.floor(Math.random() * 91));
  const [scale, setScale] = useState(1);

  return (
    <button
      style={{
        position: "absolute",
        top: `${randomY}%`,
        left: `${randomX}%`,
        width: "100px",
        height: "100px",
        transform: `scale(${scale})`,
      }}
      className="bg-pink-500"
    >
      Ignorance
    </button>
  );
}
