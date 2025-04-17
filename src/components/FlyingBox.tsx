import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, useAnimation } from "framer-motion";
import { getRandomNumber } from "@/lib/utils";

type FlyingBoxProps = {
  id: number;
  onLanded: (id: number, wasWhacked: boolean) => void;
  fromCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  targetPos?: { x: number; y: number };
  speed?: number;
  content?: string;
  shouldHide: boolean;
};

const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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
  const boxRef = useRef<HTMLDivElement>(null);

  const startPos = useMemo(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const offX = () => getRandomNumber(100, 800);
    const offY = () => getRandomNumber(100, 800);

    return {
      "top-left": {
        x: -offX(),
        y: -offY(),
      },
      "top-right": {
        x: screenWidth + offX(),
        y: -offY(),
      },
      "bottom-left": {
        x: -offX(),
        y: screenHeight + offY(),
      },
      "bottom-right": {
        x: screenWidth + offX(),
        y: screenHeight + offY(),
      },
    };
  }, []);

  const animateToTarget = () => {
    if (!boxRef.current) return;

    const { width, height } = boxRef.current.getBoundingClientRect();
    const adjustedX = targetPos.x - width / 2;
    const adjustedY = targetPos.y - height / 2;

    const start = startPos[fromCorner] ?? { x: 0, y: 0 };
    const distance = getDistance(start.x, start.y, adjustedX, adjustedY);
    const basePixelsPerSecond = 500;
    const effectiveSpeed = speed ?? 1;

    const actualSpeed = basePixelsPerSecond * effectiveSpeed;
    const duration = distance / actualSpeed;
    console.log({
      targetX: targetPos.x,
      boxWidth: boxRef.current?.getBoundingClientRect().width,
      adjustedX:
        targetPos.x - (boxRef.current?.getBoundingClientRect().width ?? 0) / 2,
    });

    controls.start({
      x: adjustedX,
      y: adjustedY,
      transition: { duration, ease: "linear" },
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!wasWhackedRef.current) {
        onLanded(id, false);
      }
    }, duration * 1000);
  };

  useEffect(() => {
    setIsVisible(!shouldHide);
  }, [shouldHide]);

  useEffect(() => {
    const timeout = requestAnimationFrame(() => {
      animateToTarget();
    });

    timeoutRef.current = setTimeout(() => {
      if (!wasWhackedRef.current) {
        onLanded(id, false);
      }
    }, speed * 1000);

    (window as any)[`whackAffliction_${id}`] = () => {
      if (wasWhackedRef.current) return;
      wasWhackedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onLanded(id, true);
    };

    window.addEventListener("resize", animateToTarget); // 🧠 auto-fix on resize

    return () => {
      cancelAnimationFrame(timeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      delete (window as any)[`whackAffliction_${id}`];
      window.removeEventListener("resize", animateToTarget);
    };
  }, []);

  const isImage = (src: string) =>
    /^https?:\/\//.test(src) || /\.(png|jpe?g|gif|svg|webp)$/.test(src);

  if (!isVisible) return null;

  return (
    <motion.div
      ref={boxRef}
      initial={startPos[fromCorner]}
      animate={controls}
      className="afflictions"
      data-affliction-id={id}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "pink",
        transformOrigin: "center",
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
