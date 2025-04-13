import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

type FlyingBoxProps = {
  id: number;
  onLanded: (id: number, wasWhacked: boolean) => void;
  fromCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  speed?: number;
  content?: string;
  shouldHide: boolean;
};

const FlyingBox: React.FC<FlyingBoxProps> = ({
  id,
  onLanded,
  fromCorner = "top-left",
  speed = 1,
  content = "🚀",
  shouldHide,
}) => {
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(true);
  const wasWhackedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPos = {
    "top-left": { x: "-100vw", y: "-100vh" },
    "top-right": { x: "100vw", y: "-100vh" },
    "bottom-left": { x: "-100vw", y: "100vh" },
    "bottom-right": { x: "100vw", y: "100vh" },
  };

  useEffect(() => {
    setIsVisible(!shouldHide);
  }, [shouldHide]);

  useEffect(() => {
    controls.start({
      x: 0,
      y: 0,
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
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
