"use client"

import { useFreezeSound } from '@/hooks/useFreezeSound';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Crystal {
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    rotation: number;
}

interface Snowflake {
    id: number;
    x: number;
    size: number;
    delay: number;
    duration: number;
    opacity: number;
}

// Place crystals along edges and corners
const generateEdgeCrystals = (): Crystal[] => {
    const crystals: Crystal[] = [];
    let id = 0;

    // Corner clusters (denser, bigger)
    const corners = [
        { cx: 3, cy: 3 },   // top-left
        { cx: 97, cy: 3 },  // top-right
        { cx: 3, cy: 97 },  // bottom-left
        { cx: 97, cy: 97 }, // bottom-right
    ];

    corners.forEach((corner) => {
        for (let i = 0; i < 5; i++) {
            crystals.push({
                id: id++,
                x: corner.cx + (Math.random() - 0.5) * 15,
                y: corner.cy + (Math.random() - 0.5) * 15,
                size: 20 + Math.random() * 35,
                delay: Math.random() * 0.8,
                rotation: Math.random() * 360,
            });
        }
    });

    // Edge crystals (spread along edges, smaller)
    // Top edge
    for (let i = 0; i < 6; i++) {
        crystals.push({
            id: id++,
            x: 15 + Math.random() * 70,
            y: Math.random() * 8,
            size: 10 + Math.random() * 20,
            delay: 0.3 + Math.random() * 1,
            rotation: Math.random() * 360,
        });
    }
    // Bottom edge
    for (let i = 0; i < 5; i++) {
        crystals.push({
            id: id++,
            x: 15 + Math.random() * 70,
            y: 92 + Math.random() * 8,
            size: 10 + Math.random() * 18,
            delay: 0.4 + Math.random() * 1,
            rotation: Math.random() * 360,
        });
    }
    // Left edge
    for (let i = 0; i < 4; i++) {
        crystals.push({
            id: id++,
            x: Math.random() * 8,
            y: 15 + Math.random() * 70,
            size: 8 + Math.random() * 18,
            delay: 0.5 + Math.random() * 1,
            rotation: Math.random() * 360,
        });
    }
    // Right edge
    for (let i = 0; i < 4; i++) {
        crystals.push({
            id: id++,
            x: 92 + Math.random() * 8,
            y: 15 + Math.random() * 70,
            size: 8 + Math.random() * 18,
            delay: 0.5 + Math.random() * 1,
            rotation: Math.random() * 360,
        });
    }

    return crystals;
};

export const EfekFreeze = ({ active }: { active: boolean }) => {
    const [crystals, setCrystals] = useState<Crystal[]>([]);
    const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
    const { playFreezeSound } = useFreezeSound();

    useEffect(() => {
        (async () => {
            if (active) {
                playFreezeSound();
                setCrystals(generateEdgeCrystals());

                const newSnowflakes: Snowflake[] = Array.from({ length: 35 }, (_, i) => ({
                    id: i,
                    x: Math.random() * 100,
                    size: 2 + Math.random() * 5,
                    delay: Math.random() * 4,
                    duration: 5 + Math.random() * 7,
                    opacity: 0.2 + Math.random() * 0.4,
                }));
                setSnowflakes(newSnowflakes);
            } else {
                setCrystals([]);
                setSnowflakes([]);
            }
        })()
    }, [active]);

    if (!active) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="fixed inset-0 z-0 overflow-hidden">
                <div
                    className="absolute inset-0 transition-all duration-1000"
                    style={{
                        background: `radial-gradient(ellipse at 30% 20%, hsl(210 60% 25% / 0.4) 0%, transparent 50%),
                 radial-gradient(ellipse at 70% 60%, hsl(200 85% 55% / 0.1) 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 90%, hsl(220 30% 8%) 0%, transparent 60%)`,
                    }}
                />
                <div className="absolute inset-0 animate-breath" style={{
                    background: 'radial-gradient(circle at 50% 40%, hsl(195 100% 70% / 0.03) 0%, transparent 60%)',
                }} />
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {/* Ice crystals at edges */}
                {crystals.map((crystal) => (
                    <div
                        key={crystal.id}
                        className="absolute animate-crystal-grow"
                        style={{
                            left: `${crystal.x}%`,
                            top: `${crystal.y}%`,
                            animationDelay: `${crystal.delay}s`,
                        }}
                    >
                        <svg
                            width={crystal.size}
                            height={crystal.size}
                            viewBox="0 0 100 100"
                            style={{ transform: `rotate(${crystal.rotation}deg)` }}
                        >
                            <defs>
                                <filter id={`crystal-glow-${crystal.id}`}>
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* 6-pointed ice crystal with glow */}
                            <g filter={`url(#crystal-glow-${crystal.id})`}>
                                {[0, 60, 120, 180, 240, 300].map((angle) => (
                                    <line
                                        key={angle}
                                        x1="50"
                                        y1="50"
                                        x2={50 + 42 * Math.cos((angle * Math.PI) / 180)}
                                        y2={50 + 42 * Math.sin((angle * Math.PI) / 180)}
                                        stroke="hsl(195 100% 80% / 0.7)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                ))}
                                {/* Branches */}
                                {[0, 60, 120, 180, 240, 300].map((angle) => (
                                    <g key={`branch-${angle}`}>
                                        {[0.35, 0.6, 0.8].map((pos) => {
                                            const cx = 50 + 42 * pos * Math.cos((angle * Math.PI) / 180);
                                            const cy = 50 + 42 * pos * Math.sin((angle * Math.PI) / 180);
                                            const branchLen = 14 * (1 - pos);
                                            return [35, -35].map((branchAngle) => {
                                                const ba = angle + branchAngle;
                                                return (
                                                    <line
                                                        key={`${pos}-${branchAngle}`}
                                                        x1={cx}
                                                        y1={cy}
                                                        x2={cx + branchLen * Math.cos((ba * Math.PI) / 180)}
                                                        y2={cy + branchLen * Math.sin((ba * Math.PI) / 180)}
                                                        stroke="hsl(195 100% 85% / 0.5)"
                                                        strokeWidth="0.8"
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            });
                                        })}
                                    </g>
                                ))}
                            </g>
                            {/* Center diamond */}
                            <polygon
                                points="50,46 54,50 50,54 46,50"
                                fill="hsl(195 100% 90% / 0.6)"
                            />
                        </svg>
                    </div>
                ))}

                {/* Snowflakes */}
                {snowflakes.map((flake) => (
                    <div
                        key={`snow-${flake.id}`}
                        className="absolute animate-snowfall"
                        style={{
                            left: `${flake.x}%`,
                            top: '-5%',
                            width: flake.size,
                            height: flake.size,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, hsl(195 100% 90% / ${flake.opacity}), transparent)`,
                            animationDelay: `${flake.delay}s`,
                            animationDuration: `${flake.duration}s`,
                        }}
                    />
                ))}
            </motion.div>
        </>
    );
};
