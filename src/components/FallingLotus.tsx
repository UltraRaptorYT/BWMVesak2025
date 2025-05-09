import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

type FallingLotusProps = {
  id: number;
  onCaught: (id: number, wasWhacked: boolean) => void;
  startX: number;
  size: number;
  duration?: number;
  content?: string;
  shouldHide: boolean;
};

const FallingLotus: React.FC<FallingLotusProps> = ({
  id,
  onCaught,
  startX,
  size,
  duration = 10,
  content = "🌸",
  shouldHide,
}) => {
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(true);
  const wasWhackedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lotusRef = useRef<HTMLDivElement>(null);

  const animateToTarget = () => {
    if (!lotusRef.current && !window) return;

    controls.start({
      y: window.innerHeight + size,
      transition: { duration, ease: "linear" },
    });
    
    controls.start({
      x: [startX - 20, startX + 20],
      transition: {
        repeat: Infinity,
        repeatType: "reverse",
        duration: 0.5, // 🟢 controls speed of swaying
        ease: "easeInOut",
      },
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!wasWhackedRef.current) {
        onCaught(id, false);
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
        onCaught(id, false);
      }
    }, duration * 1000);

    (window as any)[`whackLotus_${id}`] = () => {
      if (wasWhackedRef.current) return;
      wasWhackedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onCaught(id, true);
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
      ref={lotusRef}
      className="lotus"
      data-lotus-id={id}
      initial={{ y: -size }} // 🟢 Start above screen
      animate={controls}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // background: "pink",
        transformOrigin: "center",
      }}
    >
      {isImage(content) ? (
        <img
          src={content}
          alt="flying content"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            // filter: enemyList.find((e) => e.type === type)?.filter ?? "none",
          }}
        />
      ) : (
        <span style={{ fontSize: 40 }}>{content}</span>
      )}
    </motion.div>
  );
};

export default FallingLotus;
