"use client"

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { bgMusic } from "@/lib/bgMusic";

const MusicToggle = () => {
  const [playing, setPlaying] = useState(bgMusic.getIsPlaying());

  const toggle = () => {
    if (playing) {
      bgMusic.stop();
    } else {
      bgMusic.start();
    }
    setPlaying(!playing);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      title={playing ? "Matikan musik" : "Nyalakan musik"}
    >
      {playing ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </motion.button>
  );
};

export default MusicToggle;
