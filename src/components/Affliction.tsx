import { useEffect, useRef, useState } from "react";

type AfflictionProps = {
  id: number;
  speed?: number;
  onMissed?: () => void;
};

export function Affliction({ id, speed = 1000, onMissed }: AfflictionProps) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "absolute",
    width: "100px",
    height: "100px",
    transform: "translate(-50%, -50%)",
    borderRadius: "9999px",
    zIndex: 10,
    top: "0%",
    left: "0%",
  });
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // console.log("🎯 Affliction mounted", id);
    const corners = [
      { top: "0%", left: "0%" },
      { top: "0%", left: "100%" },
      { top: "100%", left: "0%" },
      { top: "100%", left: "100%" },
    ];
    const start = corners[Math.floor(Math.random() * corners.length)];

    setStyle((prev) => ({
      ...prev,
      top: start.top,
      left: start.left,
    }));

    const frame = requestAnimationFrame(() => {
      setStyle((prev) => ({
        ...prev,
        top: "50%",
        left: "50%",
        transition: `top ${speed}ms ease-in-out, left ${speed}ms ease-in-out`,
      }));
    });

    const removeTimeout = setTimeout(() => {
      console.log("🚨 Affliction timeout fired", id);
      if (typeof onMissed === "function") onMissed();
      setIsVisible(false);
    }, speed + 100);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(removeTimeout);
    };
  }, [id, speed, onMissed]);

  useEffect(() => {
    if (ref.current) {
      ref.current.dataset.afflictionId = id.toString();
    }
  }, [id]);

  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      className="bg-pink-500 afflictions flex items-center justify-center text-white font-bold"
      data-affliction-id={id}
      style={style}
    >
      Ignorance
    </div>
  );
}
