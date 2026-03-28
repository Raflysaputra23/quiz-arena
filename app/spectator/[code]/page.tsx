/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useMemo, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Users, Trophy, Zap, ArrowLeft, BarChart3, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CircularTimer from "@/components/CircularTimer";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import Image from "next/image";
import LoadingScreen from "@/components/LoadingScreen";

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

type ParticipantAnswerRow = {
    question_id?: string;
    participant_id?: string;
    session_id?: string;
};

const Spectator = ({ params }: { params: Promise<{ code: string }> }) => {
    const { code } = use(params);
    const router = useRouter();
    const [room, setRoom] = useState<SpectatorRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);

    const subsRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([]);
    const supaRef = useRef(createClient());
    const mountedRef = useRef(true);
    const currentQuestionIdRef = useRef<string | null>(null);
    const prevQuestionIdForDedupRef = useRef<string | null>(null);
    const countedParticipantIdsRef = useRef<Set<string>>(new Set());

    const activeQuestionId = room?.questions?.[room?.currentQuestionIndex ?? 0]?.id ?? null;

    useEffect(() => {
        if (prevQuestionIdForDedupRef.current !== activeQuestionId) {
            prevQuestionIdForDedupRef.current = activeQuestionId;
            currentQuestionIdRef.current = activeQuestionId;
            countedParticipantIdsRef.current.clear();
        }
    }, [activeQuestionId]);

    useEffect(() => {
        const q = room?.questions?.[room.currentQuestionIndex ?? 0];
        if (!room || room.status !== "playing" || !q) {
            return;
        }
        const questionStartTime = room.questionStartTime;
        const timeLimit = q.timeLimit;
        const tick = () => {
            const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
            setTimeLeft(Math.max(0, timeLimit - elapsed));
        };
        tick();
        const interval = setInterval(tick, 200);
        return () => clearInterval(interval);
    }, [room, room?.status, room?.currentQuestionIndex, room?.questionStartTime, room?.questions]);

    useEffect(() => {
        mountedRef.current = true;
        const supabase = supaRef.current;

        const clearSubs = () => {
            subsRef.current.forEach((ch) => supabase.removeChannel(ch));
            subsRef.current = [];
        };

        const loadSession = async (roomCode: string) => {
            setError("");
            setLoading(true);
            clearSubs();

            const { data: session, error: sessionError } = await supabase
                .from("quiz_sessions")
                .select("*, quizzes(*, questions(*, question_options(*)))")
                .eq("room_code", roomCode)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (!mountedRef.current) return;

            if (sessionError || !session) {
                const msg =
                    sessionError?.code === "PGRST116"
                        ? "Sesi tidak ditemukan!"
                        : sessionError?.message || "Sesi tidak ditemukan!";
                setError(msg);
                setRoom(null);
                setLoading(false);
                return;
            }

            if (session.status === "finished") {
                setLoading(false);
                router.push(`/results/${roomCode}`);
                return;
            }

            const quiz = session.quizzes;
            if (!quiz) {
                setError("Data quiz tidak lengkap.");
                setRoom(null);
                setLoading(false);
                return;
            }

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

            if (!mountedRef.current) return;

            const initialQid = questions[session.current_question_index]?.id ?? null;
            prevQuestionIdForDedupRef.current = initialQid;
            currentQuestionIdRef.current = initialQid;
            countedParticipantIdsRef.current.clear();

            setRoom({
                sessionId: session.id,
                quizTitle: quiz.title || "Quiz",
                status: session.status,
                currentQuestionIndex: session.current_question_index,
                questionStartTime: session.question_start_time
                    ? new Date(session.question_start_time).getTime()
                    : 0,
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

            const sessionId = session.id;

            const sessionCh = supabase
                .channel(`spec-session-${sessionId}`)
                .on(
                    "postgres_changes",
                    { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` },
                    (payload) => {
                        if (!mountedRef.current) return;
                        const d = payload.new as Record<string, unknown>;
                        if (d.status === "finished") {
                            router.push(`/results/${roomCode}`);
                            return;
                        }
                        setRoom((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      status: d.status as string,
                                      currentQuestionIndex: d.current_question_index as number,
                                      questionStartTime: d.question_start_time
                                          ? new Date(d.question_start_time as string).getTime()
                                          : prev.questionStartTime,
                                      answerCount:
                                          d.current_question_index !== prev.currentQuestionIndex
                                              ? 0
                                              : prev.answerCount,
                                      mode: (d.mode as string) || prev.mode,
                                  }
                                : prev
                        );
                    }
                )
                .subscribe();

            const partCh = supabase
                .channel(`spec-parts-${sessionId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "session_participants",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    async () => {
                        if (!mountedRef.current) return;
                        const { data } = await supabase.from("session_participants").select("*").eq("session_id", sessionId);
                        if (!mountedRef.current || !data) return;
                        setRoom((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      participants: data.map((p) => ({
                                          id: p.id,
                                          name: p.guest_name || "Player",
                                          avatar: p.avatar,
                                          score: p.score,
                                      })),
                                  }
                                : prev
                        );
                    }
                )
                .subscribe();

            const ansCh = supabase
                .channel(`spec-ans-${sessionId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "participant_answers",
                        filter: `session_id=eq.${sessionId}`,
                    },
                    async (payload) => {
                        if (!mountedRef.current) return;
                        const row = payload.new as ParticipantAnswerRow;
                        if (!row?.question_id || !row?.participant_id) return;
                        if (row.question_id !== currentQuestionIdRef.current) return;
                        if (countedParticipantIdsRef.current.has(row.participant_id)) return;
                        countedParticipantIdsRef.current.add(row.participant_id);

                        const { data: parts } = await supabase
                            .from("session_participants")
                            .select("*")
                            .eq("session_id", sessionId);

                        if (!mountedRef.current || !parts) return;
                        setRoom((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                participants: parts.map((p) => ({
                                    id: p.id,
                                    name: p.guest_name || "Player",
                                    avatar: p.avatar,
                                    score: p.score,
                                })),
                                answerCount: prev.answerCount + 1,
                            };
                        });
                    }
                )
                .subscribe();

            subsRef.current = [sessionCh, partCh, ansCh];
            if (mountedRef.current) setLoading(false);
        };

        if (code) void loadSession(code);

        return () => {
            mountedRef.current = false;
            clearSubs();
        };
    }, [code, router]);

    const sortedParticipants = useMemo(() => {
        if (!room) return [];
        return [...room.participants].sort((a, b) => b.score - a.score);
    }, [room]);

    if (loading) return <LoadingScreen />;

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
                                        <CircularTimer
                                            timeLeft={room.status === "playing" ? timeLeft : 0}
                                            totalTime={question.timeLimit}
                                            size={80}
                                        />
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
                                            <Image
                                                src={question.imageUrl}
                                                alt=""
                                                className="max-h-48 mx-auto rounded-xl mb-4 object-contain"
                                            />
                                        )}

                                        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-relaxed">
                                            {question.text}
                                        </h2>

                                        <div className="mt-4 flex flex-col lg:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <BarChart3 className="w-4 h-4" /> {question.points} poin
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" /> {room.answerCount}/{room.participants.length}{" "}
                                                sudah jawab
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

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
                                            {i === 0 ? (
                                                <Crown className="w-3.5 h-3.5 text-gold" />
                                            ) : (
                                                i + 1
                                            )}
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
