import { useEffect, useState } from "react";

export function Affliction() {
  const [position, setPosition] = useState({ top: "0%", left: "0%" });
  const [inCenter, setInCenter] = useState(false);

  useEffect(() => {
    // Pick a random corner
    const corners = [
      { top: "0%", left: "0%" }, // top-left
      { top: "0%", left: "90%" }, // top-right
      { top: "90%", left: "0%" }, // bottom-left
      { top: "90%", left: "90%" }, // bottom-right
    ];
    const startCorner = corners[Math.floor(Math.random() * corners.length)];
    setPosition(startCorner);

    // Delay movement to center so it animates
    const timeout = setTimeout(() => {
      setPosition({ top: "50%", left: "50%" });
      setInCenter(true);
    }, 50); // slight delay to trigger transition

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="bg-pink-500 afflictions flex items-center justify-center text-white font-bold"
      style={{
        position: "absolute",
        width: "100px",
        height: "100px",
        top: position.top,
        left: position.left,
        transform: inCenter ? "translate(-50%, -50%)" : "none",
        transition: "all 1s ease-in-out",
        borderRadius: "9999px", // optional for a circle
      }}
    >
      Ignorance
    </div>
  );
}
