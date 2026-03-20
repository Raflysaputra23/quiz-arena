/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowLeft, Clock, Users, Trophy, Trash2, Play, Plus, ChevronDown, ChevronUp, Eye, LogIn, User, Star, Shield, Snowflake, Loader } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import LoadingScreen from "@/components/LoadingScreen";
import { FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

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
    const [loadingStart, setLoadingStart] = useState(false);
    const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showModalPower, setShowModalPower] = useState<string | null>(null);
    const [selected, setSelected] = useState({
        doublePoints: true,
        fiftyFifty: true,
        lightning: true,
        freeze: true
    });
    const supaRef = useRef(createClient());


    const fetchQuizzes = async () => {
        if (!user) return;
        const supabase = supaRef.current;
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
        const supabase = supaRef.current;
        const { error } = await supabase.from("quizzes").delete().eq("id", id);
        if (error) { toastError("Gagal menghapus quiz"); return; }
        toastSuccess("Quiz dihapus");
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
    };

    const startNewSession = async (quizId: string) => {
        if (!user) return;
        setLoadingStart(true);
        const supabase = supaRef.current;
        const newCode = Array.from({ length: 6 }, () =>
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
        ).join("");

        const powerUpsJson = JSON.stringify(selected);
        const { error } = await supabase.from("quiz_sessions").insert({
            quiz_id: quizId,
            host_id: user.id,
            room_code: newCode,
            allowed_skill: powerUpsJson,
            status: "waiting",
        });
        if (error) { toastError("Gagal membuat sesi"); return; }
        setLoadingStart(false);
        router.push(`/lobby/${newCode}`);
    };

    const viewResults = (roomCode: string) => {
        router.push(`/results/${roomCode}`);
    };

    const viewRoom = (roomCode: string) => {
        router.push(`/lobby/${roomCode}`);
    }

    const getModeLabel = (mode: string) => {
        switch (mode) {
            case "speed": return { label: "⚡ Speed", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" };
            case "survival": return { label: "💀 Survival", color: "bg-purple-500/20 text-purple-500 border-purple-500/50" };
            case "battle": return { label: "⚔️ Battle", color: "bg-red-500/20 text-red-500 border-red-500/50" };
            default: return { label: "✨ Normal", color: "bg-primary/20 text-primary border-primary/50" };
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "finished":
                return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">Selesai</span>;
            case "playing":
                return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-500">Berlangsung</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground animate-pulse">Menunggu</span>;
        }
    };

    if (authLoading) return <LoadingScreen />;

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
                        <p className="text-muted-foreground mt-4 animate-pulse">Memuat riwayat...</p>
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
                                <div className="p-5 flex items-start lg:items-center lg:justify-between lg:flex-row overflow-hidden flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                                            <Zap className="w-6 h-6 text-primary-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-poppins font-bold text-foreground leading-5">{quiz.title}</h3>
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
                                            onClick={() => setShowModalPower(quiz.id)}
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
                                            className="bg-destructive/10 border cursor-pointer border-destructive text-destructive hover:text-destructive hover:bg-destructive/40"
                                            onClick={() => setSelectedId(quiz.id)}
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
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {getStatusBadge(session.status)}
                                                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${getModeLabel(session.mode).color}`}>
                                                                    {getModeLabel(session.mode).label}
                                                                </span>
                                                                <span className="shrink-0 inline-flex items-center gap-1 text-xs py-0.5 px-2 rounded-full bg-muted-foreground/10 text-muted-foreground">
                                                                    <User className="w-3 h-3" /> {session.participants.length}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-muted-foreground">
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
                                                                    className="shrink-0 text-xs h-7 cursor-pointer bg-primary hover:bg-primary/80"
                                                                    onClick={() => viewResults(session.room_code)}
                                                                >
                                                                    <Eye className="w-3 h-3 mr-1" />
                                                                    Lihat Hasil
                                                                </Button>
                                                            )}
                                                            {session.status === "waiting" && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-xs h-7 cursor-pointer bg-green-500 hover:bg-green-500/80"
                                                                    onClick={() => viewRoom(session.room_code)}
                                                                >
                                                                    <LogIn className="w-3 h-3 mr-1" />
                                                                    Join Room
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {/* Top 3 participants */}
                                                        {session.participants.length > 0 && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {session.participants.slice(0, 5).map((p, pIdx) => (
                                                                    <div
                                                                        key={pIdx}
                                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 text-xs`}
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

            {/* INFO DELETE QUIZ */}
            <AnimatePresence mode="wait">
                {selectedId &&
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedId(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass rounded-3xl p-6 max-w-lg w-full space-y-5 max-h-[85vh]"
                        >
                            <h1 className="text-2xl font-bold font-poppins">Hapus</h1>
                            <p className="text-muted-foreground">Anda yakin ingin menghapus history ini?</p>
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => { deleteQuiz(selectedId); setSelectedId(null); }}
                                >
                                    Hapus
                                </Button>
                                <Button
                                    size="sm"
                                    className="cursor-pointer"
                                    variant="primary"
                                    onClick={() => setSelectedId(null)}
                                >
                                    Batal
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                }
            </AnimatePresence>

            {/* MODAL START QUIZ */}
            <AnimatePresence mode="wait">
                {showModalPower &&
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowModalPower(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass rounded-3xl p-6 max-w-lg w-full space-y-5 max-h-[85vh]"
                        >
                            <h1 className="text-2xl font-bold font-poppins">Power Ups</h1>
                            <FieldGroup className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                <FieldLabel onClick={() =>
                                    setSelected(prev => ({
                                        ...prev,
                                        doublePoints: !prev.doublePoints
                                    }))
                                }
                                    className={"p-4 bg-gold/10 w-full text-gold border-gold rounded-xl flex gap-4 border transition has-data-[state=checked]:border-gold has-data-[state=checked]:bg-gold/20 dark:has-data-[state=checked]:bg-gold/20"}>
                                    <Checkbox checked={selected.doublePoints} className="text-gold border-gold peer" />
                                    <FieldContent>
                                        <FieldTitle><Star className="w-4 h-4" /> 2x Double Points</FieldTitle>
                                        <FieldDescription>
                                            Dapatkan 2x poin untuk jawaban benar
                                        </FieldDescription>
                                    </FieldContent>
                                </FieldLabel>
                                <FieldLabel onClick={() =>
                                    setSelected(prev => ({
                                        ...prev,
                                        fiftyFifty: !prev.fiftyFifty
                                    }))
                                }
                                    className="bg-primary/10 w-full border text-primary border-primary p-4 rounded-xl flex items-center gap-4 transition has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/20 dark:has-data-[state=checked]:bg-primary/20">
                                    <Checkbox checked={selected.fiftyFifty} className="text-primary border-primary" />
                                    <FieldContent>
                                        <FieldTitle><Shield className="w-4 h-4" /> Fifty Fifty</FieldTitle>
                                        <FieldDescription>
                                            Hapus 2 pilihan ganda jawaban salah
                                        </FieldDescription>
                                    </FieldContent>
                                </FieldLabel>
                                <FieldLabel onClick={() =>
                                    setSelected(prev => ({
                                        ...prev,
                                        lightning: !prev.lightning
                                    }))
                                }
                                    className="bg-red-500/10 w-full border text-red-500 border-red-500 p-4 rounded-xl flex items-center gap-4 transition has-data-[state=checked]:border-red-500 has-data-[state=checked]:bg-red-500/20 dark:has-data-[state=checked]:bg-red-500/20">
                                    <Checkbox checked={selected.lightning} className="text-red-500 border-red-500" />
                                    <FieldContent>
                                        <FieldTitle><Zap className="w-4 h-4" /> Efek Lightning</FieldTitle>
                                        <FieldDescription>
                                            Menghilangkan pertanyaan selama 4 detik
                                        </FieldDescription>
                                    </FieldContent>
                                </FieldLabel>
                                <FieldLabel onClick={() =>
                                    setSelected(prev => ({
                                        ...prev,
                                        freeze: !prev.freeze
                                    }))
                                }
                                    className="bg-sky-500/10 w-full border text-sky-500 border-sky-500 p-4 rounded-xl flex items-center gap-4 transition has-data-[state=checked]:border-sky-500 has-data-[state=checked]:bg-sky-500/20 dark:has-data-[state=checked]:bg-sky-500/20">
                                    <Checkbox checked={selected.freeze} className="text-sky-500 border-sky-500" />
                                    <FieldContent>
                                        <FieldTitle><Snowflake className="w-4 h-4" /> Efek Freeze</FieldTitle>
                                        <FieldDescription>
                                            Tidak dapat menjawab selama 4 detik
                                        </FieldDescription>
                                    </FieldContent>
                                </FieldLabel>
                            </FieldGroup>
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => setShowModalPower(null)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    size="sm"
                                    className="cursor-pointer"
                                    variant="primary"
                                    onClick={() => startNewSession(showModalPower)}
                                    disabled={loadingStart}
                                >
                                    Mulai
                                    {loadingStart && <Loader className="ml-1 animate-spin" />}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    );
};

export default History;
