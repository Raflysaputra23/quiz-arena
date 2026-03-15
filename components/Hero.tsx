"use client"
import { useAuth } from "@/hooks/useAuth";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuiz } from "@/hooks/useQuiz";
import { useEffect, useState } from "react";
import { toastError } from "@/lib/toast";
import { Button } from "./ui/button";
import { ChevronDown, Eye, Gamepad2, Globe2, Loader2, Plus, Users } from "lucide-react";
import { Input } from "./ui/input";


const Hero = () => {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [showJoin, setShowJoin] = useState(false);
    const [joining, setJoining] = useState(false);
    const { joinRoom, setCurrentRoom, clearParticipantSession, exitFullscreen } = useQuiz();
    const { user } = useAuth();
    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
    const router = useRouter();

    useEffect(() => {
        (async() => {
            setCurrentRoom(null);
            exitFullscreen();
            await clearParticipantSession();
        })()
    }, [setCurrentRoom]);

    const handleJoin = async () => {
        if (!code.trim()) { toastError("Masukkan kode game!"); return; }
        if (!name.trim()) { toastError("Masukkan nama kamu!"); return; }
        setJoining(true);
        try {
            const success = await joinRoom(code.trim().toUpperCase(), name.trim());
            if (success) {
                router.push(`/lobby/${code.trim().toUpperCase()}`);
            } else {
                toastError("Kode game tidak ditemukan atau sudah dimulai!");
            }
        } finally {
            setJoining(false);
        }
    };

    const handleCreate = () => {
        if (!user) {
            toastError("Silakan login terlebih dahulu!");
            router.push("/login");
            return;
        }
        router.push("/create");
    };

    const stats = [
        { value: "∞", label: "Quiz Bisa Dibuat" },
        { value: "Real Time", label: "Multiplayer" },
        { value: "3", label: "Mode Permainan" },
        { value: "3", label: "Power-Ups" },
    ];

    return (
        <motion.section style={{ opacity: showJoin ? 100 : heroOpacity, scale: showJoin ? 1 : heroScale }} className="relative py-20 md:py-32 px-4 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[200px]" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary text-sm text-primary"
                    >
                        <Gamepad2 className="w-4 h-4 text-primary" />
                        Platform Quiz Interaktif #?
                    </motion.div>

                    <motion.h1
                        className="text-6xl md:text-8xl lg:text-9xl font-poppins tracking-tighter font-bold leading-none"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                    >
                        <span className="text-foreground">Quiz</span>
                        <span className="text-primary">Arena</span>
                    </motion.h1>

                    <motion.p
                        className="text-md text-muted-foreground max-w-xl mx-auto leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        Buat, bagikan, dan mainkan quiz secara real-time bersama teman-temanmu.
                        Tantang mereka dengan berbagai mode permainan yang seru!
                    </motion.p>
                </motion.div>

                {/* CTA Buttons / Join Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    {!showJoin ? (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant={'primary'}
                                    size={'lg'}
                                    className="cursor-pointer shadow-glow px-10 py-7 rounded-2xl"
                                    onClick={() => setShowJoin(true)}
                                >
                                    <Users className="w-5 h-5 mr-2" />
                                    Gabung Game
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border cursor-pointer border-primary hover:text-primary bg-primary/10 text-primary hover:bg-primary/30 text-md px-10 py-7 rounded-2xl"
                                    onClick={handleCreate}
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Buat Quiz Baru
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    variant="primary"
                                    className="border cursor-pointer text-md px-10 py-7 rounded-2xl"
                                    onClick={() => router.push("/marketplace")}
                                >
                                    <Globe2 className="w-5 h-5 mr-2" />
                                    Marketplace
                                </Button>
                            </motion.div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass rounded-2xl p-6 max-w-md mx-auto space-y-4"
                        >
                            <Input
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                placeholder="Masukkan kode game"
                                value={code}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    const filtered = raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
                                    setCode(filtered);
                                }}
                                className="text-center text-xl! font-poppins tracking-[0.3em] bg-secondary border-border h-14 uppercase placeholder:text-sm placeholder:tracking-normal"
                                maxLength={6}
                            />
                            <Input
                                placeholder="Nama kamu"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-secondary border-border h-12"
                                maxLength={20}
                            />
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1 bg-destructive hover:bg-destructive/80 cursor-pointer"
                                    onClick={() => setShowJoin(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    variant={'primary'}
                                    className="flex-1 group"
                                    onClick={handleJoin}
                                    disabled={joining}
                                >
                                    {joining ? <span className="flex items-center gap-2">Bergabung <Loader2 className="animate-spin" /></span> : "Gabung"}
                                </Button>
                                <Button
                                    variant="primaryOutliner"
                                    className="border border-primary flex-1 cursor-pointer"
                                    onClick={() => {
                                        if (!code.trim()) { toastError("Masukkan kode game!"); return; }
                                        router.push(`/spectator/${code.trim().toUpperCase()}`);
                                    }}
                                >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Tonton
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Stats row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-8 pt-8"
                >
                    {stats.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            className="text-center"
                        >
                            <div className="text-2xl font-poppins font-medium text-gradient">{s.value}</div>
                            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="pt-8"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="inline-flex flex-col items-center text-muted-foreground/40 cursor-pointer"
                        onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                    >
                        <span className="text-xs mb-1">Scroll untuk lihat fitur</span>
                        <ChevronDown className="w-5 h-5" />
                    </motion.div>
                </motion.div>
            </div>
        </motion.section>
    )
}

export default Hero
