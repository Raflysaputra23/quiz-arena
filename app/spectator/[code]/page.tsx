/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useMemo, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Users, Trophy, Zap, Loader2, ArrowLeft, Clock, BarChart3, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CircularTimer from "@/components/CircularTimer";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import Image from "next/image";

interface SpectatorRoom {
    sessionId: string;
    quizTitle: string;
    status: string;
    currentQuestionIndex: number;
    questionStartTime: number;
    totalQuestions: number;
    questions: Array<{ id: string; text: string; timeLimit: number; type: string; points: number; imageUrl?: string }>;
    participants: Array<{ id: string; name: string; avatar: string; score: number }>;
    answerCount: number;
    mode: string;
}

const Spectator = ({ params }: { params: Promise<{ code: string }> }) => {
    const { code } = use(params);
    const router = useRouter();
    const [room, setRoom] = useState<SpectatorRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const subsRef = useRef<any[]>([]);
    const supabaseRef = useRef(createClient());

    const loadSession = async (roomCode: string) => {
        setLoading(true);
        const supabase = supabaseRef.current;
        const { data: session } = await supabase
            .from("quiz_sessions")
            .select("*, quizzes(*, questions(*, question_options(*)))")
            .eq("room_code", roomCode)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!session) {
            setError("Sesi tidak ditemukan!");
            setLoading(false);
            return;
        }

        if (session.status === "finished") {
            router.push(`/results/${roomCode}`);
            return;
        }

        const quiz = session.quizzes;
        const questions = (quiz.questions || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((q: any) => ({
                id: q.id,
                text: q.text,
                timeLimit: q.time_limit,
                type: q.type,
                points: q.points,
                imageUrl: q.image_url || undefined,
            }));

        const { data: participants } = await supabase
            .from("session_participants")
            .select("*")
            .eq("session_id", session.id);

        setRoom({
            sessionId: session.id,
            quizTitle: quiz.title,
            status: session.status,
            currentQuestionIndex: session.current_question_index,
            questionStartTime: session.question_start_time ? new Date(session.question_start_time).getTime() : 0,
            totalQuestions: questions.length,
            questions,
            participants: (participants || []).map((p) => ({
                id: p.id,
                name: p.guest_name || "Player",
                avatar: p.avatar,
                score: p.score,
            })),
            answerCount: 0,
            mode: session.mode || "normal",
        });

        // Subscribe to realtime
        const sessionCh = supabase
            .channel(`spec-session-${session.id}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${session.id}` }, (payload) => {
                const d = payload.new;
                if (d.status === "finished") {
                    router.push(`/results/${roomCode}`);
                    return;
                }
                setRoom(prev => prev ? {
                    ...prev,
                    status: d.status,
                    currentQuestionIndex: d.current_question_index,
                    questionStartTime: d.question_start_time ? new Date(d.question_start_time).getTime() : prev.questionStartTime,
                    answerCount: d.current_question_index !== prev.currentQuestionIndex ? 0 : prev.answerCount,
                    mode: d.mode || prev.mode,
                } : prev);
            })
            .subscribe();

        const partCh = supabase
            .channel(`spec-parts-${session.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` }, async () => {
                const { data } = await supabase.from("session_participants").select("*").eq("session_id", session.id);
                if (data) {
                    setRoom(prev => prev ? {
                        ...prev,
                        participants: data.map((p) => ({ id: p.id, name: p.guest_name || "Player", avatar: p.avatar, score: p.score })),
                    } : prev);
                }
            })
            .subscribe();

        const ansCh = supabase
            .channel(`spec-ans-${session.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "participant_answers" }, async () => {
                const { data: parts } = await supabase.from("session_participants").select("*").eq("session_id", session.id);
                if (parts) {
                    setRoom(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            participants: parts.map((p) => ({ id: p.id, name: p.guest_name || "Player", avatar: p.avatar, score: p.score })),
                            answerCount: prev.answerCount + 1,
                        };
                    });
                }
            })
            .subscribe();

        subsRef.current = [sessionCh, partCh, ansCh];
        setLoading(false);
    };

    useEffect(() => {
        const supabase = supabaseRef.current;
        (async() => {
            if (code) await loadSession(code);
        })()
        return () => {
            subsRef.current.forEach(ch => supabase.removeChannel(ch));
        };
    }, [code]);


    // Timer
    useEffect(() => {
        if (!room || room.status !== "playing") return;
        const q = room.questions[room.currentQuestionIndex];
        if (!q) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - room.questionStartTime) / 1000);
            setTimeLeft(Math.max(0, q.timeLimit - elapsed));
        }, 200);
        return () => clearInterval(interval);
    }, [room?.currentQuestionIndex, room?.questionStartTime, room?.status]);

    const sortedParticipants = useMemo(() => {
        if (!room) return [];
        return [...room.participants].sort((a, b) => b.score - a.score);
    }, [room]);

    if (loading) {
        return (
            <div className="min-h-screen quiz-pattern flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="min-h-screen quiz-pattern flex items-center justify-center">
                <div className="glass rounded-2xl p-8 text-center space-y-4 max-w-md">
                    <p className="text-destructive font-medium">{error || "Sesi tidak ditemukan"}</p>
                    <Button variant="outline" onClick={() => router.push("/")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                    </Button>
                </div>
            </div>
        );
    }

    const question = room.questions[room.currentQuestionIndex];
    const progressPct = room.totalQuestions > 0 ? ((room.currentQuestionIndex + 1) / room.totalQuestions) * 100 : 0;

    return (
        <div className="min-h-screen quiz-pattern flex flex-col overflow-hidden">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 flex items-center gap-3 flex-wrap border-b border-border/30"
            >
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-accent" />
                    <span className="font-display font-bold text-foreground text-sm">Mode Penonton</span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground font-medium">{room.quizTitle}</span>
                </div>
                <div className="flex-1">
                    <Progress value={progressPct} className="h-2" />
                </div>
                <span className="text-sm font-display font-bold text-foreground">
                    {room.currentQuestionIndex + 1}/{room.totalQuestions}
                </span>
            </motion.div>

            {room.status === "waiting" ? (
                <div className="flex-1 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-2xl p-8 text-center space-y-4 max-w-md"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"
                        >
                            <Eye className="w-10 h-10 text-accent" />
                        </motion.div>
                        <h2 className="font-display font-bold text-xl text-foreground">Menunggu Quiz Dimulai</h2>
                        <p className="text-muted-foreground text-sm">
                            Quiz belum dimulai. Kamu akan otomatis melihat soal saat host mulai!
                        </p>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                            <Users className="w-4 h-4" />
                            {room.participants.length} peserta sudah bergabung
                        </div>
                    </motion.div>
                </div>
            ) : (
                <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 max-w-6xl mx-auto w-full">
                    {/* Question Area */}
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        {question && (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -40 }}
                                    transition={{ type: "spring", stiffness: 120 }}
                                    className="w-full space-y-6"
                                >
                                    <div className="flex justify-center">
                                        <CircularTimer timeLeft={timeLeft} totalTime={question.timeLimit} size={80} />
                                    </div>

                                    <div className="glass rounded-2xl p-8 text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4"
                                        >
                                            <Eye className="w-3 h-3" />
                                            Menonton Live
                                        </motion.div>

                                        {question.imageUrl && (
                                            <Image src={question.imageUrl} alt="" className="max-h-48 mx-auto rounded-xl mb-4 object-contain" />
                                        )}

                                        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-relaxed">
                                            {question.text}
                                        </h2>

                                        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <BarChart3 className="w-4 h-4" /> {question.points} poin
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {room.answerCount}/{room.participants.length} sudah jawab
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Leaderboard Sidebar */}
                    <div className="lg:w-72 space-y-4">
                        <div className="glass rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-display font-bold text-foreground">
                                <Trophy className="w-4 h-4 text-primary" />
                                Peringkat Live
                            </div>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {sortedParticipants.map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                                    >
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-secondary text-muted-foreground">
                                            {i === 0 ? <Crown className="w-3.5 h-3.5 text-[hsl(var(--gold))]" /> : i + 1}
                                        </span>
                                        <span className="text-lg">{p.avatar}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                                        </div>
                                        <span className="text-sm font-display font-bold text-gradient">{p.score}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default Spectator;
