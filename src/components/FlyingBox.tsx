import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { getRandomNumber } from "@/lib/utils";

type FlyingBoxProps = {
  id: number;
  onLanded: (id: number, wasWhacked: boolean) => void;
  fromCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  targetPos?: { x: number | string; y: number | string };
  speed?: number;
  content?: string;
  shouldHide: boolean;
};

const FlyingBox: React.FC<FlyingBoxProps> = ({
  id,
  onLanded,
  fromCorner = "top-left",
  targetPos = { x: 0, y: 0 },
  speed = 1,
  content = "🚀",
  shouldHide,
}) => {
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(true);
  const wasWhackedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPos = {
    "top-left": {
      x: `${-1 * getRandomNumber(50, 150)}vw`,
      y: `${-1 * getRandomNumber(50, 150)}vh`,
    },
    "top-right": {
      x: `${getRandomNumber(50, 150)}vw`,
      y: `${-1 * getRandomNumber(50, 150)}vh`,
    },
    "bottom-left": {
      x: `${-1 * getRandomNumber(50, 150)}vw`,
      y: `${getRandomNumber(50, 150)}vh`,
    },
    "bottom-right": {
      x: `${getRandomNumber(50, 150)}vw`,
      y: `${getRandomNumber(50, 150)}vh`,
    },
  };

  useEffect(() => {
    setIsVisible(!shouldHide);
  }, [shouldHide]);

  useEffect(() => {
    controls.start({
      x: targetPos.x ?? 0,
      y: targetPos.y ?? 0,
      transition: { duration: speed, ease: "linear" },
    });

    // Handle timeout - remove if not whacked
    timeoutRef.current = setTimeout(() => {
      if (!wasWhackedRef.current) {
        onLanded(id, false); // ❌ Missed
      }
    }, speed * 1000);

    // Register global whack trigger
    (window as any)[`whackAffliction_${id}`] = () => {
      if (wasWhackedRef.current) return;
      wasWhackedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onLanded(id, true); // ✅ Whacked
    };

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      delete (window as any)[`whackAffliction_${id}`];
    };
  }, []);

  const isImage = (src: string) =>
    /^https?:\/\//.test(src) || /\.(png|jpe?g|gif|svg|webp)$/.test(src);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={startPos[fromCorner]}
      animate={controls}
      className="afflictions"
      data-affliction-id={id}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        // transform: "translate(-50%, -50%)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "pink",
      }}
    >
      {isImage(content) ? (
        <img
          src={content}
          alt="flying content"
          style={{ width: 100, height: 100 }}
        />
      ) : (
        <span style={{ fontSize: 40 }}>{content}</span>
      )}
    </motion.div>
  );
};

export default FlyingBox;
