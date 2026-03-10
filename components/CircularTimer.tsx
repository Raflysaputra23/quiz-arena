"use client"

import { motion } from "framer-motion";

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
}

const CircularTimer = ({ timeLeft, totalTime, size = 80 }: CircularTimerProps) => {
  const progress = Math.max(0, timeLeft / totalTime);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  // Color transitions
  const getColor = () => {
    if (isCritical) return "hsl(var(--destructive))";
    if (isUrgent) return "hsl(var(--warning))";
    if (progress > 0.5) return "hsl(var(--primary))";
    return "hsl(var(--accent))";
  };

  return (
    <div className="relative overflow-hidden" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      {isUrgent && (
        <motion.div
          className="absolute -inset-2 rounded-full"
          style={{
            background: isCritical
              ? `radial-gradient(circle, hsl(var(--destructive) / 0.4) 0%, transparent 70%)`
              : `radial-gradient(circle, hsl(var(--warning) / 0.3) 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Background pulse when critical */}
      {isCritical && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-destructive"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={5}
          opacity={0.5}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Glow filter for progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          opacity={0.3}
          filter="blur(4px)"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={`font-display font-bold ${size >= 80 ? "text-2xl" : "text-xl"} ${
            isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-foreground"
          }`}
          animate={isCritical ? { scale: [1, 1.3, 1] } : isUrgent ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5, repeat: isCritical || isUrgent ? Infinity : 0 }}
        >
          {timeLeft}
        </motion.span>
      </div>
    </div>
  );
};

export default CircularTimer;
