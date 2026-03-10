"use client"

import { motion } from "framer-motion";
import { Zap, Brain, Trophy, Star, HelpCircle, Sparkles } from "lucide-react";

const floatingIcons = [
  { Icon: Brain, x: "15%", y: "20%", delay: 0, size: 28, color: "text-primary" },
  { Icon: Trophy, x: "75%", y: "15%", delay: 0.5, size: 24, color: "text-warning" },
  { Icon: Star, x: "85%", y: "55%", delay: 1, size: 20, color: "text-gold" },
  { Icon: HelpCircle, x: "10%", y: "65%", delay: 1.5, size: 22, color: "text-accent" },
  { Icon: Sparkles, x: "60%", y: "75%", delay: 0.8, size: 26, color: "text-primary" },
  { Icon: Zap, x: "30%", y: "80%", delay: 1.2, size: 18, color: "text-warning" },
];

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background quiz-pattern overflow-hidden">
      {/* Floating icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size, color }, i) => (
        <motion.div
          key={i}
          className={`absolute ${color} opacity-20`}
          style={{ left: x, top: y }}
          animate={{
            y: [0, -20, 0, 15, 0],
            x: [0, 10, -10, 5, 0],
            rotate: [0, 10, -10, 5, 0],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(217 91% 60% / 0.08), transparent 70%)",
          left: "20%",
          top: "30%",
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(199 89% 48% / 0.06), transparent 70%)",
          right: "15%",
          bottom: "25%",
        }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          {/* Ring pulse */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-primary"
            animate={{ scale: [1, 1.5, 1.8], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-accent"
            animate={{ scale: [1, 1.5, 1.8], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="font-poppins text-3xl font-bold text-gradient mb-2">QuizArena</h1>
          <p className="text-sm text-muted-foreground">Mempersiapkan arena...</p>
        </motion.div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary"
              animate={{
                y: [0, -12, 0],
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
