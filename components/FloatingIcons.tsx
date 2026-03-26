import { Brain, HelpCircle, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { motion } from 'framer-motion';

const floatingIcons = [
    { Icon: Brain, x: "15%", y: "20%", delay: 0, size: 28, color: "text-primary" },
    { Icon: Trophy, x: "75%", y: "15%", delay: 0.5, size: 24, color: "text-warning" },
    { Icon: Star, x: "85%", y: "55%", delay: 1, size: 20, color: "text-gold" },
    { Icon: HelpCircle, x: "10%", y: "65%", delay: 1.5, size: 22, color: "text-accent" },
    { Icon: Sparkles, x: "60%", y: "75%", delay: 0.8, size: 26, color: "text-primary" },
    { Icon: Zap, x: "30%", y: "80%", delay: 1.2, size: 18, color: "text-warning" },
];
const FloatingIcons = () => {
    return (
        <>
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
        </>
    )
}

export default FloatingIcons;
