/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowLeft, Clock, Users, Trophy, Trash2, Play, Plus, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import LoadingScreen from "@/components/LoadingScreen";

interface SessionHistory {
    id: string;
    room_code: string;
    status: string;
    created_at: string;
    finished_at: string | null;
    mode: string;
    participant_count: number;
    participants: { guest_name: string; avatar: string; score: number }[];
}

interface QuizHistory {
    id: string;
    title: string;
    description: string;
    room_code: string;
    created_at: string;
    question_count: number;
    sessions: SessionHistory[];
}

const History = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [quizzes, setQuizzes] = useState<QuizHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

    const fetchQuizzes = async () => {
        if (!user) return;
        const supabase = createClient();
        const { data, error } = await supabase
            .from("quizzes")
            .select(`
        id, title, description, room_code, created_at,
        questions(id),
        quiz_sessions(id, room_code, status, created_at, finished_at, mode,
          session_participants(guest_name, avatar, score)
        )
      `)
            .eq("id_user", user.id)
            .order("created_at", { ascending: false });

        if (error) { toastError("Gagal memuat riwayat"); return; }

        setQuizzes(
            (data ?? []).map((q: any) => ({
                id: q.id,
                title: q.title,
                description: q.description,
                room_code: q.room_code,
                created_at: q.created_at,
                question_count: q.questions?.length ?? 0,
                sessions: (q.quiz_sessions ?? [])
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((s: any) => ({
                        id: s.id,
                        room_code: s.room_code,
                        status: s.status,
                        created_at: s.created_at,
                        finished_at: s.finished_at,
                        mode: s.mode || "normal",
                        participant_count: s.session_participants?.length ?? 0,
                        participants: (s.session_participants ?? [])
                            .sort((a: any, b: any) => b.score - a.score)
                            .map((p: any) => ({
                                guest_name: p.guest_name || "Player",
                                avatar: p.avatar,
                                score: p.score,
                            })),
                    })),
            }))
        );
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            if (user) {
                fetchQuizzes();
            } else {
                router.push("/login");
            }
        })()
    }, [user]);


    const deleteQuiz = async (id: string) => {
        const supabase = createClient();
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        console.log(error);
        if (error) { toastError("Gagal menghapus quiz"); return; }
        toastSuccess("Quiz dihapus");
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
    };

    const startNewSession = async (quizId: string) => {
        if (!user) return;
        const supabase = createClient();
        const newCode = Array.from({ length: 6 }, () =>
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
        ).join("");

        const { error } = await supabase.from("quiz_sessions").insert({
            quiz_id: quizId,
            host_id: user.id,
            room_code: newCode,
            status: "waiting",
        });
        if (error) { toastError("Gagal membuat sesi"); return; }
        router.push(`/lobby/${newCode}`);
    };

    const viewResults = (roomCode: string) => {
        router.push(`/results/${roomCode}`);
    };

    const getModeLabel = (mode: string) => {
        switch (mode) {
            case "speed": return "⚡ Speed";
            case "survival": return "💀 Survival";
            default: return "✨ Normal";
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "finished":
                return <span className="px-2 py-0.5 rounded-full text-xs bg-success/20 text-success">Selesai</span>;
            case "playing":
                return <span className="px-2 py-0.5 rounded-full text-xs bg-warning/20 text-warning">Berlangsung</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">Menunggu</span>;
        }
    };

    if(authLoading) return <LoadingScreen />;

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden">
            <header className="flex items-center gap-4 p-6 border-b border-border">
                <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-poppins font-bold text-foreground">Riwayat Quiz</span>
                </div>
                <div className="ml-auto">
                    <Button variant={'primary'} onClick={() => router.push("/create")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Quiz
                    </Button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-6 space-y-4">
                {loading ? (
                    <div className="text-center py-16">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"
                        />
                        <p className="text-muted-foreground mt-4">Memuat riwayat...</p>
                    </div>
                ) : quizzes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 glass rounded-2xl shadow"
                    >
                        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="font-poppins text-xl font-bold text-foreground mb-2">Belum Ada Quiz</h2>
                        <p className="text-muted-foreground mb-6">Buat quiz pertamamu sekarang!</p>
                        <Button variant={'primary'} onClick={() => router.push("/create")}>
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Quiz
                        </Button>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        {quizzes.map((quiz, i) => (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass rounded-xl overflow-hidden"
                            >
                                {/* Quiz header */}
                                <div className="p-5 flex items-start lg:items-center lg:justify-between lg:flex-row flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                                            <Zap className="w-6 h-6 text-primary-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-poppins font-bold text-foreground truncate">{quiz.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(quiz.created_at).toLocaleDateString("id-ID")}
                                                </span>
                                                <span>{quiz.question_count} soal</span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {quiz.sessions.length} sesi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant={'primary'}
                                            onClick={() => startNewSession(quiz.id)}
                                            title="Main Lagi"
                                        >
                                            <Play className="w-4 h-4 mr-1" />
                                            Main Lagi
                                        </Button>
                                        {quiz.sessions.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="primaryOutliner"
                                                className="border border-primary"
                                                onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
                                            >
                                                {expandedQuiz === quiz.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/10"
                                            onClick={() => deleteQuiz(quiz.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Session history (expandable) */}
                                <AnimatePresence>
                                    {expandedQuiz === quiz.id && quiz.sessions.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-border overflow-hidden"
                                        >
                                            <div className="p-4 space-y-3">
                                                <p className="text-xs font-poppins font-bold text-muted-foreground uppercase tracking-wider">
                                                    Riwayat Sesi
                                                </p>
                                                {quiz.sessions.map((session, sIdx) => (
                                                    <motion.div
                                                        key={session.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: sIdx * 0.05 }}
                                                        className="rounded-lg bg-secondary/50 p-3 space-y-2"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusBadge(session.status)}
                                                                <span className="text-xs text-muted-foreground">
                                                                    {getModeLabel(session.mode)}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(session.created_at).toLocaleDateString("id-ID", {
                                                                        day: "numeric", month: "short", year: "numeric",
                                                                        hour: "2-digit", minute: "2-digit",
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {session.status === "finished" && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-xs h-7"
                                                                    onClick={() => viewResults(session.room_code)}
                                                                >
                                                                    <Eye className="w-3 h-3 mr-1" />
                                                                    Lihat Hasil
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {/* Top 3 participants */}
                                                        {session.participants.length > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {session.participants.slice(0, 5).map((p, pIdx) => (
                                                                    <div
                                                                        key={pIdx}
                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 text-xs"
                                                                    >
                                                                        <span>{pIdx === 0 ? "🥇" : pIdx === 1 ? "🥈" : pIdx === 2 ? "🥉" : p.avatar}</span>
                                                                        <span className="text-foreground font-medium">{p.guest_name}</span>
                                                                        <span className="text-primary font-bold">{p.score}</span>
                                                                    </div>
                                                                ))}
                                                                {session.participant_count > 5 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        +{session.participant_count - 5} lainnya
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default History;
