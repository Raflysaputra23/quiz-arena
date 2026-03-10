/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/supabase/client";

interface Reaction {
    id: string;
    emoji: string;
    x: number;
}

const EMOJIS = ["😂", "🔥", "👏", "😱", "❤️", "🎉", "💪", "😭"];

interface FloatingReactionsProps {
    sessionId: string;
    participantName?: string;
}

const FloatingReactions = ({ sessionId, participantName }: FloatingReactionsProps) => {
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const channelRef = useRef<any>(null);

    const addReaction = useCallback((emoji: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        const x = 10 + Math.random() * 80;
        setReactions((prev) => [...prev.slice(-15), { id, emoji, x }]);
        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2500);
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel(`reactions-${sessionId}`)
            .on("broadcast", { event: "reaction" }, (payload) => {
                const { emoji } = payload.payload;
                addReaction(emoji);
            })
            .subscribe();

        channelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);



    const sendReaction = useCallback((emoji: string) => {
        addReaction(emoji);
        channelRef.current?.send({
            type: "broadcast",
            event: "reaction",
            payload: { emoji, name: participantName },
        });
    }, [addReaction, participantName]);

    return (
        <>
            {/* Floating reactions */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
                <AnimatePresence>
                    {reactions.map((r) => (
                        <motion.div
                            key={r.id}
                            initial={{ opacity: 1, y: window.innerHeight, x: `${r.x}vw`, scale: 0.5 }}
                            animate={{ opacity: 0, y: -100, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2.5, ease: "easeOut" }}
                            className="absolute text-3xl"
                        >
                            {r.emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Emoji picker bar */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex gap-1 px-3 py-2 rounded-full glass shadow-elevated"
                >
                    {EMOJIS.map((emoji) => (
                        <motion.button
                            key={emoji}
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => sendReaction(emoji)}
                            className="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:bg-secondary/80 transition-colors"
                        >
                            {emoji}
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        </>
    );
};

export default FloatingReactions;
