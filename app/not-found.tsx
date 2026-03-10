"use client"

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Brain, Trophy, Star, HelpCircle, Sparkles, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";

const floatingIcons = [
  { Icon: Brain, x: "12%", y: "18%", delay: 0, size: 24, color: "text-primary" },
  { Icon: Trophy, x: "80%", y: "12%", delay: 0.6, size: 20, color: "text-warning" },
  { Icon: Star, x: "88%", y: "60%", delay: 1.2, size: 18, color: "text-gold" },
  { Icon: HelpCircle, x: "8%", y: "70%", delay: 0.3, size: 22, color: "text-accent" },
  { Icon: Sparkles, x: "65%", y: "80%", delay: 0.9, size: 20, color: "text-primary" },
  { Icon: Zap, x: "25%", y: "85%", delay: 1.5, size: 16, color: "text-warning" },
];

const NotFound = () => {
  const location = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log("404 Error: User attempted to access non-existent route:", location);
  }, [location]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background quiz-pattern overflow-hidden">
      {/* Floating icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size, color }, i) => (
        <motion.div
          key={i}
          className={`absolute ${color} opacity-20`}
          style={{ left: x, top: y }}
          animate={{
            y: [0, -15, 0, 12, 0],
            x: [0, 8, -8, 4, 0],
            rotate: [0, 8, -8, 4, 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 6 + i,
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
        className="absolute w-72 h-72 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(217 91% 60% / 0.06), transparent 70%)",
          left: "15%",
          top: "25%",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-56 h-56 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(0 84% 60% / 0.04), transparent 70%)",
          right: "10%",
          bottom: "20%",
        }}
        animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="relative"
        >
          <motion.div
            className="w-32 h-32 rounded-3xl bg-gradient-danger flex items-center justify-center shadow-glow"
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="font-display text-5xl font-bold text-destructive-foreground">404</span>
          </motion.div>
          {/* Ring pulse */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-destructive"
            animate={{ scale: [1, 1.4, 1.7], opacity: [0.5, 0.15, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-accent"
            animate={{ scale: [1, 1.4, 1.7], opacity: [0.4, 0.1, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
          />
        </motion.div>

        {/* Title & Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="font-display text-3xl font-bold text-gradient mb-2">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Arena yang kamu cari tidak ada. Mungkin sudah berakhir atau belum dimulai.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="glass border-border gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-primary text-primary-foreground gap-2 shadow-glow"
          >
            <Home className="w-4 h-4" />
            Beranda
          </Button>
        </motion.div>

        {/* Decorative dots */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground"
              animate={{
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
