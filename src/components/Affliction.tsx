import { useEffect, useState } from "react";

type AfflictionProps = {
  speed?: number;
  onMissed?: () => void;
};

export function Affliction({ speed = 1000, onMissed }: AfflictionProps) {
  const [style, setStyle] = useState<React.CSSProperties>({
    top: "0%",
    left: "0%",
    transform: "translate(0, 0)",
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const corners = [
      { top: "0%", left: "0%" },
      { top: "0%", left: "100%" },
      { top: "100%", left: "0%" },
      { top: "100%", left: "100%" },
    ];
    const start = corners[Math.floor(Math.random() * corners.length)];

    // Set starting position
    setStyle({
      top: start.top,
      left: start.left,
      transform: "translate(-50%, -50%)",
      position: "absolute",
    });

    // Glide to center
    const toCenterTimeout = setTimeout(() => {
      setStyle((prev) => ({
        ...prev,
        top: "50%",
        left: "50%",
        transition: `top ${speed}ms ease-in-out, left ${speed}ms ease-in-out`,
      }));
    }, 50);

    // Remove from DOM and call onMissed
    const removeTimeout = setTimeout(() => {
      if (typeof onMissed === "function") {
        onMissed();
      }
      setIsVisible(false);
    }, speed + 100); // add slight buffer

    return () => {
      clearTimeout(toCenterTimeout);
      clearTimeout(removeTimeout);
    };
  }, [speed, onMissed]);

  if (!isVisible) return null;

  return (
    <div
      className="bg-pink-500 afflictions flex items-center justify-center text-white font-bold"
      style={{
        ...style,
        width: "100px",
        height: "100px",
        borderRadius: "9999px",
      }}
    >
      Ignorance
    </div>
  );
}
