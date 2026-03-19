"use client"

import { motion } from "framer-motion";
import { Zap, Shield, Clock, Star, Snowflake } from "lucide-react";
import { Sounds } from "@/lib/sounds";

export interface PowerUpState {
  fiftyFifty: boolean;
  extraTime: boolean;
  doublePoints: boolean;
  freeze: boolean;
  lightning: boolean;
}

interface PowerUpBarProps {
  powerUps: PowerUpState;
  onUseFiftyFifty: () => void;
  onUseExtraTime: () => void;
  onUseDoublePoints: () => void;
  onUseFreeze: () => void;
  onUseLightning: () => void;
  allowed_skill: string;
  disabled?: boolean;
}

const PowerUpBar = ({ powerUps, onUseFiftyFifty, onUseExtraTime, onUseDoublePoints, onUseFreeze, onUseLightning, allowed_skill, disabled }: PowerUpBarProps) => {
  const items = [
    {
      key: "fiftyFifty",
      label: "50:50",
      icon: Shield,
      used: powerUps.fiftyFifty,
      onUse: onUseFiftyFifty,
      color: "text-primary",
      desc: "Hapus 2 jawaban salah",
    },
    // {
    //   key: "extraTime",
    //   label: "+5s",
    //   icon: Clock,
    //   used: powerUps.extraTime,
    //   onUse: onUseExtraTime,
    //   color: "text-accent",
    //   desc: "Tambah 5 detik",
    // },
    {
      key: "doublePoints",
      label: "2×",
      icon: Star,
      used: powerUps.doublePoints,
      onUse: onUseDoublePoints,
      color: "text-gold",
      desc: "Poin ganda",
    },
    {
      // efek freeze
      key: "freeze",
      label: "Freeze",
      icon: Snowflake,
      used: powerUps.freeze,
      onUse: onUseFreeze,
      color: "text-sky-500",
      desc: "Beku sementara",
    },
    {
      // efek lightning
      key: "lightning",
      label: "Lightning",
      icon: Zap,
      used: powerUps.lightning,
      onUse: onUseLightning,
      color: "text-red-500",
      desc: "Hilangkan pertanyaan",
    }
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((item) => {
        if (JSON.parse(allowed_skill)[item.key]) {
          return (
            <motion.button
              key={item.key}
              whileHover={!item.used && !disabled ? { scale: 1.1 } : {}}
              whileTap={!item.used && !disabled ? { scale: 0.9 } : {}}
              onClick={() => {
                if (!item.used && !disabled) {
                  Sounds.pop();
                  item.onUse();
                }
              }}
              disabled={item.used || disabled}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${item.used
                ? "bg-secondary/30 text-muted-foreground/40 line-through"
                : "glass hover:shadow-glow cursor-pointer"
                }`}
              title={item.desc}
            >
              <item.icon className={`w-3.5 h-3.5 ${item.used ? "text-muted-foreground/40" : item.color}`} />
              <span className={item.used ? "" : item.color}>{item.label}</span>
              {!item.used && !disabled && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        } else {
          return null;
        }
      }).flat()}
    </div>
  );
};

export default PowerUpBar;
