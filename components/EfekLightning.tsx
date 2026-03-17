"use client"

import { useLightningSound } from '@/hooks/useLightningSound';
import { useEffect, useState, useCallback } from 'react';

interface LightningBolt {
    id: number;
    points: string;
    delay: number;
    opacity: number;
    strokeWidth: number;
}

interface Spark {
    id: number;
    x: number;
    y: number;
    tx: number;
    ty: number;
    size: number;
    delay: number;
}

const generateBoltPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 8): string => {
    const points: [number, number][] = [[startX, startY]];
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;

    for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 120;
        const jitterY = (Math.random() - 0.5) * 20;
        points.push([startX + dx * i + jitterX, startY + dy * i + jitterY]);
    }
    points.push([endX, endY]);

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
};

export const EfekLightning = ({ active }: { active: boolean }) => {
    const [bolts, setBolts] = useState<LightningBolt[]>([]);
    const [sparks, setSparks] = useState<Spark[]>([]);
    const [flashKey, setFlashKey] = useState(0);
    const { playLightningSound } = useLightningSound();

    const generateBolts = useCallback(() => {
        const newBolts: LightningBolt[] = [];
        // Main bolts from top
        for (let i = 0; i < 3; i++) {
            const startX = 200 + Math.random() * 600;
            newBolts.push({
                id: i,
                points: generateBoltPath(startX, 0, startX + (Math.random() - 0.5) * 200, 600, 10),
                delay: Math.random() * 0.3,
                opacity: 0.6 + Math.random() * 0.4,
                strokeWidth: 1.5 + Math.random() * 2,
            });
            // Branch bolts
            if (Math.random() > 0.4) {
                const branchY = 100 + Math.random() * 300;
                const branchX = startX + (Math.random() - 0.5) * 80;
                newBolts.push({
                    id: 100 + i,
                    points: generateBoltPath(branchX, branchY, branchX + (Math.random() - 0.5) * 200, branchY + 100 + Math.random() * 200, 5),
                    delay: 0.1 + Math.random() * 0.2,
                    opacity: 0.3 + Math.random() * 0.3,
                    strokeWidth: 0.5 + Math.random() * 1,
                });
            }
        }
        setBolts(newBolts);
        setFlashKey((k) => k + 1);

        // Sparks at bolt endpoints
        const newSparks: Spark[] = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: 300 + Math.random() * 400,
            y: 400 + Math.random() * 200,
            tx: (Math.random() - 0.5) * 150,
            ty: (Math.random() - 0.5) * 150,
            size: 2 + Math.random() * 4,
            delay: Math.random() * 0.5,
        }));
        setSparks(newSparks);
    }, []);

    useEffect(() => {
        (async () => {
            if (!active) {
                setBolts([]);
                setSparks([]);
                return;
            } else {
                playLightningSound();
            }

            generateBolts();
            const interval = setInterval(generateBolts, 2000 + Math.random() * 1500);
            return () => clearInterval(interval);
        })()
    }, [active, generateBolts]);

    if (!active) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
            {/* Screen flash */}
            <div
                key={flashKey}
                className="absolute inset-0 animate-lightning-flash"
                style={{ background: 'hsl(270 80% 65% / 0.15)' }}
            />

            {/* Ambient electric glow */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
            radial-gradient(ellipse at 50% 0%, hsl(270 80% 65% / 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 40%, hsl(260 100% 75% / 0.05) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 60%, hsl(280 60% 85% / 0.04) 0%, transparent 35%)
          `,
                }}
            />

            {/* Lightning bolts */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <filter id="lightning-glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {bolts.map((bolt) => (
                    <g key={bolt.id}>
                        {/* Glow layer */}
                        <path
                            d={bolt.points}
                            fill="none"
                            stroke="hsl(270 80% 65% / 0.3)"
                            strokeWidth={bolt.strokeWidth * 4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="2000"
                            style={{
                                animation: `lightning-bolt-draw 0.8s ease-out ${bolt.delay}s forwards`,
                                strokeDashoffset: 2000,
                                opacity: 0,
                            }}
                        />
                        {/* Core bolt */}
                        <path
                            d={bolt.points}
                            fill="none"
                            stroke={`hsl(260 100% 75% / ${bolt.opacity})`}
                            strokeWidth={bolt.strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#lightning-glow)"
                            strokeDasharray="2000"
                            style={{
                                animation: `lightning-bolt-draw 0.8s ease-out ${bolt.delay}s forwards`,
                                strokeDashoffset: 2000,
                                opacity: 0,
                            }}
                        />
                        {/* White core */}
                        <path
                            d={bolt.points}
                            fill="none"
                            stroke="hsl(280 60% 95% / 0.9)"
                            strokeWidth={bolt.strokeWidth * 0.3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="2000"
                            style={{
                                animation: `lightning-bolt-draw 0.8s ease-out ${bolt.delay}s forwards`,
                                strokeDashoffset: 2000,
                                opacity: 0,
                            }}
                        />
                    </g>
                ))}
            </svg>

            {/* Sparks */}
            {sparks.map((spark) => (
                <div
                    key={spark.id}
                    className="absolute rounded-full"
                    style={{
                        left: spark.x,
                        top: spark.y,
                        width: spark.size,
                        height: spark.size,
                        background: 'hsl(260 100% 75%)',
                        boxShadow: '0 0 6px hsl(270 80% 65% / 0.8)',
                        '--spark-x': `${spark.tx}px`,
                        '--spark-y': `${spark.ty}px`,
                        animation: `spark-fly 0.6s ease-out ${spark.delay}s forwards`,
                        opacity: 0,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};
