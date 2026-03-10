"use client"

import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakIndicatorProps {
  streak: number;
}

const StreakIndicator = ({ streak }: StreakIndicatorProps) => {
  if (streak < 2) return null;

  const multiplier = Math.min(streak, 5);
  const colors = [
    "", "",
    "text-warning",      // 2x
    "text-orange-400",   // 3x
    "text-destructive",  // 4x
    "text-primary",      // 5x+
  ];

  return (
    <AnimatePresence>
      <motion.div
        key={streak}
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border"
      >
        <motion.div
          animate={{ rotate: [-5, 5, -5], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.4, repeat: Infinity }}
        >
          <Flame className={`w-4 h-4 ${colors[multiplier] || colors[5]}`} />
        </motion.div>
        <span className={`text-sm font-display font-bold ${colors[multiplier] || colors[5]}`}>
          {streak}x Streak!
        </span>
        {streak >= 3 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs"
          >
            🔥
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StreakIndicator;
