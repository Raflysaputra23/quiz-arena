"use client"

import { use, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Play, Users, Zap, Loader2, Gamepad2, Eye, Gauge, Skull, Sparkles } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

const MODES = [
    { id: "normal", label: "Normal", icon: Sparkles, desc: "Mode standar, jawab sesuai waktu", color: "bg-primary/20 text-primary border-primary/50" },
    { id: "speed", label: "Speed Round", icon: Gauge, desc: "Waktu berkurang setiap soal!", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" },
    { id: "survival", label: "Survival", icon: Skull, desc: "Salah = tersingkir!", color: "bg-purple-500/20 text-purple-500 border-purple-500/50" },
    { id: "battle", label: "Battle", icon: Skull, desc: "Mati = tersingkir!", color: "bg-red-500/20 text-red-500 border-red-500/50" },
];

const Lobby = ({ params }: { params: Promise<{ code: string }> }) => {
    const { code } = use(params);
    const { currentRoom, isHost, hostPlaying, setHostPlaying, startQuiz, enterFullscreen, loadRoomByCode, restoreParticipantSession } = useQuiz();
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [selectedMode, setSelectedMode] = useState("normal");
    const router = useRouter();
    const initialized = useRef(false);

    useEffect(() => {
        setHostPlaying(false);
        if (loading) return;

        const joined = sessionStorage.getItem("joinedRoom");

        if (!joined && !isHost) {
            toastError("Silahkan join lewat form!");
            router.push("/");
        }
    }, [isHost, router, loading]);

    useEffect(() => {
        if (!code || initialized.current) return;

        initialized.current = true;
        const init = async () => {
            await restoreParticipantSession();
            if (!currentRoom && code) {
                const found = await loadRoomByCode(code);
                if (!found) {
                    toastError("Room tidak ditemukan!");
                    router.push("/");
                }
            }
            setLoading(false);
        };
        init();
    }, [code, currentRoom, router]);

    useEffect(() => {
        if (currentRoom?.status === "playing" && code) {
            enterFullscreen();
            if(currentRoom.mode === "battle") {
                router.push(`/battle/${code}`);
            } else {
                router.push(`/play/${code}`);
            }
        }
        if (currentRoom?.status === "finished" && code) {
            router.push(`/results/${code}`);
        }
    }, [currentRoom, code, router]);

    const handleCopy = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            toastSuccess("Kode disalin!");
        }
    };

    const handleStart = async () => {
        if (starting) return;
        setStarting(true);
        localStorage.setItem("hostPlaying", hostPlaying ? "true" : "false");
        await startQuiz(selectedMode);
        setStarting(false);
    };

    if (!currentRoom || !code || loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg w-full space-y-6 text-center"
            >
                <div className="space-y-2">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="flex items-center justify-center gap-2 mb-4"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <Zap className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="font-poppins font-bold text-xl text-foreground">QuizArena</span>
                    </motion.div>
                    <h1 className="text-2xl font-poppins font-bold text-foreground">{currentRoom.quiz.title}</h1>
                    <p className="text-muted-foreground">{currentRoom.quiz.questions.length} soal</p>
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-2xl p-6 space-y-3"
                >
                    <p className="text-sm text-muted-foreground">Kode Game</p>
                    <div
                        className="flex items-center justify-center gap-3 cursor-pointer group"
                        onClick={handleCopy}
                    >
                        <span className="text-4xl font-poppins font-bold tracking-[0.3em] text-gradient">
                            {code}
                        </span>
                        <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground">Klik untuk menyalin • Bagikan ke teman-temanmu!</p>
                </motion.div>

                <div className="glass rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{currentRoom.participants.length} peserta bergabung</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <AnimatePresence>
                            {currentRoom.participants.map((p, i) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, scale: 0, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: i * 0.1, type: "spring" }}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.2, rotate: 10 }}
                                        className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl"
                                    >
                                        {p.avatar}
                                    </motion.div>
                                    <span className="text-xs text-muted-foreground">{p.name}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    {currentRoom.participants.length === 0 && (
                        <motion.p
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-sm text-muted-foreground"
                        >
                            Menunggu peserta bergabung...
                        </motion.p>
                    )}
                </div>

                {isHost && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                    >
                        {/* Game Mode Selection */}
                        <div className="glass rounded-xl p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">Mode Game</p>
                            <div className="grid grid-cols-3 gap-2">
                                {MODES.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSelectedMode(mode.id)}
                                        className={`flex flex-col items-center cursor-pointer border gap-1.5 rounded-lg p-3 text-xs font-medium transition-all ${selectedMode === mode.id
                                            ? mode.color
                                            : "bg-primary/10 text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <mode.icon className="w-4 h-4" />
                                        <span>{mode.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className={`${MODES.find((m) => m.id === selectedMode)?.color} text-xs inline-block px-3 p-2 rounded-md shadow`}>
                                {MODES.find((m) => m.id === selectedMode)?.desc}
                            </p>
                        </div>

                        {/* Host play/spectate toggle */}
                        <div className="glass rounded-xl p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">Mode Host</p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setHostPlaying(false)}
                                    className={`flex-1 flex items-center cursor-pointer justify-center gap-2 rounded-lg p-3 py-5 text-sm font-medium transition-all ${!hostPlaying
                                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                        : "bg-primary/10 text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Eye className="w-4 h-4" />
                                    Pengawas
                                </Button>
                                <Button
                                    onClick={() => setHostPlaying(true)}
                                    className={`flex-1 flex items-center cursor-pointer justify-center gap-2 rounded-lg p-3 py-5 text-sm font-medium transition-all ${hostPlaying
                                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                        : "bg-primary/10 text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Gamepad2 className="w-4 h-4" />
                                    Ikut Bermain
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {hostPlaying
                                    ? "Kamu akan ikut menjawab soal bersama peserta lainnya"
                                    : "Kamu hanya mengawasi dan mengontrol jalannya quiz"}
                            </p>
                        </div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                size="lg"
                                className="bg-gradient-primary cursor-pointer text-primary-foreground shadow-glow text-lg px-10 py-6 w-full"
                                onClick={handleStart}
                                disabled={starting || (currentRoom.participants.length === 0 && !hostPlaying)}
                            >
                                {starting ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Play className="w-5 h-5 mr-2" />
                                )}
                                Mulai Quiz!
                            </Button>
                        </motion.div>
                    </motion.div>
                )}

                {!isHost && (
                    <div className="glass rounded-xl p-4 text-center">
                        <motion.p
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-muted-foreground"
                        >
                            Menunggu host memulai quiz...
                        </motion.p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default Lobby;
