"use client"

import { useState, useEffect, useCallback, useMemo, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Check, X, Loader2, Eye, Users, Trophy, Clock, Skull, Gauge } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import CircularTimer from "@/components/CircularTimer";
import StreakIndicator from "@/components/StreakIndicator";
import FloatingReactions from "@/components/FloatingReactions";
import MusicToggle from "@/components/MusicToggle";
import PowerUpBar, { type PowerUpState } from "@/components/PowerUpBar";
import { Sounds } from "@/lib/sounds";
import { bgMusic } from "@/lib/bgMusic";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";

const optionLabels = ["A", "B", "C", "D"];
const optionColors = [
    { bg: "bg-gradient-primary", border: "border-primary/40" },
    { bg: "bg-gradient-success", border: "border-[hsl(var(--success))]/40" },
    { bg: "bg-gradient-accent", border: "border-accent/40" },
    { bg: "bg-gradient-danger", border: "border-destructive/40" },
];

const RESULT_DISPLAY_MS = 1000;

const PlayQuiz = ({ params }: { params: Promise<{ code: string }> }) => {
    const { code } = use(params);
    const router = useRouter();
    const { currentRoom, currentParticipant, isHost, hostPlaying, setHostPlaying, exitFullscreen, restoreParticipantSession, submitAnswer, nextQuestion, loadRoomByCode } = useQuiz();
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [shortAnswer, setShortAnswer] = useState("");
    const [answered, setAnswered] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [timeExpired, setTimeExpired] = useState(false);
    const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
    const hasAutoAdvanced = useRef(false);
    const lastTickRef = useRef(0);
    const timeExpiredRef = useRef(false);
    const restoredRef = useRef(false);
    const submitLockRef = useRef(false);

    // Power-ups
    const [powerUps, setPowerUps] = useState<PowerUpState>({ fiftyFifty: false, extraTime: false, doublePoints: false });
    const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
    const [extraTimeAdded, setExtraTimeAdded] = useState(false);
    const [doublePointsActive, setDoublePointsActive] = useState(false);

    // Survival mode: track wrong answers
    const [survivalWrongCount, setSurvivalWrongCount] = useState(0);
    const [eliminated, setEliminated] = useState(false);

    const question = currentRoom?.quiz.questions[currentRoom.currentQuestionIndex];
    const questionIdx = currentRoom?.currentQuestionIndex ?? 0;
    const totalQuestions = currentRoom?.quiz.questions.length ?? 0;
    const canPlay = !isHost || hostPlaying;
    const participantCount = currentRoom?.participants.length ?? 0;
    const answerCount = currentRoom?.currentQuestionAnswerCount ?? 0;
    const allAnswered = participantCount > 0 && answerCount >= participantCount;
    const streak = currentParticipant?.streak ?? 0;

    // Detect mode
    const mode = (currentRoom)?.mode || "normal";

    // Restore participant session on mount (handles page refresh)
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;

        const restore = async () => {
            if (!currentRoom && code) {
                const found = await loadRoomByCode(code);
                if (!found) {
                    router.push("/");
                    return;
                }
            }

            // restore participant AFTER room loaded
            if (!currentParticipant) {
                await restoreParticipantSession();
            }

            const savedHostPlaying = localStorage.getItem("hostPlaying");
            if (savedHostPlaying === "true") {
                setHostPlaying(true);
            }
        };

        restore();
    }, [code, currentRoom, currentParticipant]);

    useEffect(() => {
        if (currentRoom?.status === "finished") {
            bgMusic.stop();
            localStorage.removeItem("hostPlaying");
            exitFullscreen();
            router.push(`/results/${code}`);
        }
    }, [currentRoom, router, code]);

    // Reset on new question
    useEffect(() => {
        (async () => {
            if (question && currentRoom) {
                const serverStart = currentRoom.questionStartTime;
                const elapsed = Math.floor((Date.now() - serverStart) / 1000);
                // Speed mode: reduce time per question
                let effectiveTimeLimit = question.timeLimit;
                if (mode === "speed") {
                    effectiveTimeLimit = Math.max(5, question.timeLimit - questionIdx * 2);
                }
                const remaining = Math.max(0, effectiveTimeLimit - elapsed);
                setTimeLeft(remaining);
                setSelectedAnswer(null);
                setShortAnswer("");
                setAnswered(false);
                setShowResult(false);
                setIsCorrect(false);
                setEarnedPoints(0);
                setTimeExpired(false);
                timeExpiredRef.current = false;
                submitLockRef.current = false;
                setHiddenOptions([]);
                setExtraTimeAdded(false);
                setDoublePointsActive(false);
                lastTickRef.current = 0;
                if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                // Prevent auto-advance from firing with stale timeExpired during reset
                hasAutoAdvanced.current = true;
                const resetTimer = setTimeout(() => { hasAutoAdvanced.current = false; }, 150);
                Sounds.whoosh();
                return () => clearTimeout(resetTimer);
            }
        })()
    }, [questionIdx, question?.id, currentRoom?.questionStartTime]);

    const handleSubmit = useCallback(async (answer: string) => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;
        
        if (answered || eliminated) return;
        setAnswered(true);

        if (question) {
            let correct = false;
            if (question.type === "multiple_choice") {
                correct = answer === question.correctAnswer;
            } else {
                correct = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            }
            setIsCorrect(correct);

            if (correct) {
                Sounds.correct();
                if ((currentParticipant?.streak ?? 0) >= 1) {
                    setTimeout(() => Sounds.streak(), 300);
                }
            } else {
                Sounds.wrong();
                // Survival mode: track wrong answers, eliminate after 2
                if (mode === "survival") {
                    const newWrongCount = survivalWrongCount + 1;
                    setSurvivalWrongCount(newWrongCount);
                    if (newWrongCount >= 2) {
                        setEliminated(true);
                        // Sync elimination to DB so host can detect all-eliminated
                        if (currentParticipant) {
                            const supabase = createClient();
                            await supabase
                                .from("session_participants")
                                .update({ is_eliminated: true })
                                .eq("id", currentParticipant.id)
                                .select()
                                .single();
                        }
                    }
                }
            }

            if (correct && currentRoom) {
                const timeTaken = (Date.now() - currentRoom.questionStartTime) / 1000;
                const timeBonus = Math.max(0, Math.round((1 - timeTaken / question.timeLimit) * question.points * 0.5));
                let pts = question.points + timeBonus;
                if (doublePointsActive) pts *= 2;
                setEarnedPoints(pts);
            }
        }

        if (currentParticipant) {
            // Submit actual answer or empty string for timeout
            await submitAnswer(answer === "__timeout__" ? { answer: "", doublePoints: false } : { answer, doublePoints: doublePointsActive });
        }

        setShowResult(true);
    }, [answered, eliminated, question, currentParticipant, submitAnswer, currentRoom, doublePointsActive, mode, survivalWrongCount]);

    // Realtime timer
    useEffect(() => {
        if (!question || !currentRoom) return;
        let frame: number;

        const tick = () => {
            let effectiveTimeLimit = question.timeLimit;
            if (mode === "speed") {
                effectiveTimeLimit = Math.max(5, question.timeLimit - questionIdx * 2);
            }

            const bonusTime = extraTimeAdded ? 5 : 0;

            const elapsed = Math.floor((Date.now() - currentRoom.questionStartTime) / 1000);
            const remaining = Math.max(0, effectiveTimeLimit + bonusTime - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 5 && remaining > 0 && remaining !== lastTickRef.current) {
                lastTickRef.current = remaining;

                if (remaining <= 3) Sounds.tickUrgent()
                else Sounds.tick()
            }

            if (remaining <= 0 && !timeExpiredRef.current) {
                timeExpiredRef.current = true;
                setTimeExpired(true);

                if (!answered && !eliminated) {
                    handleSubmit("__timeout__");
                }
            }

            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [question?.id, currentRoom?.questionStartTime, answered, timeExpired, extraTimeAdded, mode, questionIdx, handleSubmit]);

    // Auto-advance + survival all-eliminated check
    useEffect(() => {
        if (!isHost || !currentRoom || hasAutoAdvanced.current) return;

        // Only react to timeExpired or answerCount changes
        if (!timeExpired && !allAnswered) return;

        // When not all answered by local state but time hasn't expired, skip
        // When time expired, we always advance
        // When allAnswered from local state, verify with DB before advancing
        const verifyAndAdvance = async () => {
            const supabase = createClient();

            // If triggered by allAnswered (not timeout), verify actual counts from DB
            if (!timeExpired) {
                const { data: dbParticipants } = await supabase
                    .from("session_participants")
                    .select("id")
                    .eq("session_id", currentRoom.sessionId);

                const currentQ = currentRoom.quiz.questions[currentRoom.currentQuestionIndex];
                if (dbParticipants && currentQ) {
                    const participantIds = dbParticipants.map((p) => p.id);
                    const { count } = await supabase
                        .from("participant_answers")
                        .select("*", { count: "exact", head: true })
                        .eq("question_id", currentQ.id)
                        .in("participant_id", participantIds);

                    const actualAnswerCount = count || 0;
                    const actualParticipantCount = dbParticipants.length;

                    // Not everyone has answered yet — don't advance
                    if (actualAnswerCount < actualParticipantCount) return;
                }
            }

            setShowResult(true);
            autoAdvanceTimer.current = setTimeout(async () => {
                if (hasAutoAdvanced.current) return;
                hasAutoAdvanced.current = true;

                // Survival mode: check if all participants are eliminated → end game immediately
                if (mode === "survival") {
                    const { data: participants } = await supabase
                        .from("session_participants")
                        .select("is_eliminated")
                        .eq("session_id", currentRoom.sessionId);

                    if (participants && participants.length > 0) {
                        const allEliminated = participants.every((p) => p.is_eliminated === true);
                        if (allEliminated) {
                            await supabase
                                .from("quiz_sessions")
                                .update({ status: "finished", finished_at: new Date().toISOString() })
                                .eq("id", currentRoom.sessionId);
                            return;
                        }
                    }
                }

                await nextQuestion();
            }, RESULT_DISPLAY_MS);
        };

        verifyAndAdvance();

        return () => {
            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        };
    }, [allAnswered, timeExpired, isHost, currentRoom?.currentQuestionIndex, mode, nextQuestion]);

    // Power-up handlers
    const handleFiftyFifty = useCallback(() => {
        if (!question || question.type !== "multiple_choice") return;
        setPowerUps((p) => ({ ...p, fiftyFifty: true }));
        const wrongOptions = question.options.filter((o) => o.id !== question.correctAnswer);
        const toHide = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2).map((o) => o.id);
        setHiddenOptions(toHide);
    }, [question]);

    const handleExtraTime = useCallback(() => {
        setPowerUps((p) => ({ ...p, extraTime: true }));
        setExtraTimeAdded(true);
    }, []);

    const handleDoublePoints = useCallback(() => {
        setPowerUps((p) => ({ ...p, doublePoints: true }));
        setDoublePointsActive(true);
    }, []);

    const sortedParticipants = useMemo(() => {
        if (!currentRoom) return [];
        return [...currentRoom.participants].sort((a, b) => b.score - a.score);
    }, [currentRoom]);

    if (!currentRoom || !question) {
        return (
            <div className="min-h-screen quiz-pattern flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const effectiveTimeLimit = mode === "speed" ? Math.max(5, question.timeLimit - questionIdx * 2) : question.timeLimit;
    const progressPct = ((questionIdx + 1) / totalQuestions) * 100;

    return (
        <div className="min-h-screen quiz-pattern flex flex-col overflow-hidden">
            <FloatingReactions sessionId={currentRoom.sessionId} participantName={currentParticipant?.name} />

            {/* Top bar */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="p-4 flex items-center gap-3 flex-wrap"
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-poppins font-bold text-foreground text-sm">
                        {questionIdx + 1}/{totalQuestions}
                    </span>
                </div>

                {/* Mode badge */}
                {mode !== "normal" && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${mode === "speed" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"
                        }`}>
                        {mode === "speed" ? <Gauge className="w-3 h-3" /> : <Skull className="w-3 h-3" />}
                        {mode === "speed" ? "Speed" : "Survival"}
                    </div>
                )}

                {/* Survival lives indicator */}
                {mode === "survival" && canPlay && !eliminated && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-xs font-bold">
                        <span className="text-destructive">❤️</span>
                        <span className={survivalWrongCount === 0 ? "text-success" : "text-warning"}>
                            {2 - survivalWrongCount}/2
                        </span>
                    </div>
                )}

                <div className="flex-1">
                    <Progress value={progressPct} className="h-2" />
                </div>

                <div className="flex items-center gap-2">
                    <StreakIndicator streak={streak} />
                    {isHost && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/15 border border-primary/30 text-muted-foreground text-xs">
                            <Users className="w-3 h-3" />
                            {answerCount}/{participantCount}
                        </div>
                    )}
                    {isHost && !hostPlaying && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/15 border border-primary/30 text-muted-foreground text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            Pengawas
                        </div>
                    )}
                    <MusicToggle />
                </div>
                <CircularTimer timeLeft={timeLeft} totalTime={effectiveTimeLimit + (extraTimeAdded ? 5 : 0)} size={64} />
            </motion.div>

            {/* Power-ups bar */}
            {canPlay && !answered && (
                <div className="px-4 pb-2 flex justify-center my-4">
                    <PowerUpBar
                        powerUps={powerUps}
                        onUseFiftyFifty={handleFiftyFifty}
                        onUseExtraTime={handleExtraTime}
                        onUseDoublePoints={handleDoublePoints}
                        disabled={answered || showResult}
                    />
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col lg:flex-row gap-6 px-4 pb-20 max-w-6xl mx-auto w-full">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={question.id}
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 0.95 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
                            className="w-full space-y-6"
                        >
                            {/* Question card */}
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="glass rounded-2xl p-8 text-center relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
                                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent/5 blur-3xl" />

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.15, type: "spring" }}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4"
                                >
                                    {question.type === "multiple_choice" ? "Pilihan Ganda" : "Isian Singkat"}
                                    <span className="text-primary/60">•</span>
                                    <span>{question.points} poin</span>
                                    {doublePointsActive && (
                                        <span className="text-gold font-bold">×2</span>
                                    )}
                                </motion.div>

                                {/* Question image */}
                                {(question).imageUrl && (
                                    <motion.img
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        src={(question).imageUrl}
                                        alt="Question"
                                        className="max-h-48 mx-auto rounded-xl mb-4 object-contain"
                                    />
                                )}

                                <h2 className="text-2xl md:text-3xl font-poppins font-bold text-foreground relative z-10 leading-relaxed">
                                    {question.text}
                                </h2>
                            </motion.div>

                            {eliminated ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass rounded-2xl p-8 text-center space-y-4"
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-gradient-danger shadow-xl"
                                    >
                                        <Skull className="w-10 h-10 text-primary-foreground" />
                                    </motion.div>
                                    <p className="text-xl font-poppins font-bold text-destructive">Kamu Tersingkir! 💀</p>
                                    <p className="text-muted-foreground text-sm">
                                        Kamu salah menjawab 2 kali di mode Survival. Menonton sisa permainan...
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                                        <Eye className="w-4 h-4" />
                                        <span>Mode Penonton</span>
                                    </div>
                                </motion.div>
                            ) : !showResult ? (
                                canPlay ? (
                                    question.type === "multiple_choice" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {question.options.map((opt, i) => {
                                                const isHidden = hiddenOptions.includes(opt.id);
                                                if (isHidden) {
                                                    return (
                                                        <motion.div
                                                            key={opt.id}
                                                            initial={{ opacity: 1 }}
                                                            animate={{ opacity: 0.2, scale: 0.95 }}
                                                            className="rounded-xl p-5 border border-border bg-secondary/20"
                                                        >
                                                            <div className="flex items-center gap-3 opacity-30">
                                                                <span className="w-10 h-10 shrink-0 rounded-xl bg-secondary text-muted-foreground font-bold text-sm flex items-center justify-center">
                                                                    {optionLabels[i]}
                                                                </span>
                                                                <span className="text-muted-foreground line-through">{opt.text}</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }
                                                return (
                                                    <motion.button
                                                        key={opt.id}
                                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 200 }}
                                                        whileHover={{ scale: 1.03, y: -2 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        className={`relative rounded-xl p-5 text-left transition-all border ${optionColors[i].border} overflow-hidden group ${selectedAnswer === opt.id
                                                            ? "ring-2 ring-primary scale-[1.02]"
                                                            : "hover:shadow-glow"
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedAnswer(opt.id);
                                                            handleSubmit(opt.id);
                                                        }}
                                                        disabled={answered}
                                                    >
                                                        <div className={`absolute inset-0 ${optionColors[i].bg} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                                        <div className="relative flex items-center gap-3">
                                                            <motion.span
                                                                whileHover={{ rotate: 5 }}
                                                                className={`w-10 h-10 shrink-0 rounded-xl ${optionColors[i].bg} text-primary-foreground font-bold text-sm flex items-center justify-center shadow-lg`}
                                                            >
                                                                {optionLabels[i]}
                                                            </motion.span>
                                                            <span className="text-foreground font-medium text-base">{opt.text}</span>
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="flex gap-3 max-w-md mx-auto"
                                        >
                                            <Input
                                                placeholder="Ketik jawabanmu..."
                                                value={shortAnswer}
                                                onChange={(e) => setShortAnswer(e.target.value)}
                                                className="bg-primary/10 h-14 text-lg"
                                                onKeyDown={(e) => e.key === "Enter" && !answered && handleSubmit(shortAnswer)}
                                                disabled={answered}
                                                maxLength={200}
                                            />
                                            <Button
                                                variant={"primary"}
                                                className="h-14 px-6"
                                                onClick={() => handleSubmit(shortAnswer)}
                                                disabled={answered}
                                            >
                                                Kirim
                                            </Button>
                                        </motion.div>
                                    )
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="glass rounded-2xl p-6 text-center space-y-3"
                                    >
                                        <Eye className="w-8 h-8 text-muted-foreground mx-auto" />
                                        <p className="text-muted-foreground text-sm">Menunggu peserta menjawab...</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {answerCount}/{participantCount} sudah menjawab
                                            </span>
                                        </div>
                                    </motion.div>
                                )
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="text-center space-y-4"
                                >
                                    {canPlay && answered && (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                                                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${isCorrect ? "bg-gradient-success" : "bg-gradient-danger"
                                                    } shadow-xl`}
                                            >
                                                {isCorrect ? <Check className="w-10 h-10 text-primary-foreground" /> : <X className="w-10 h-10 text-primary-foreground" />}
                                            </motion.div>
                                            <motion.p
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-xl font-poppins font-bold text-foreground"
                                            >
                                                {isCorrect ? "Benar! 🎉" : "Salah! 😢"}
                                            </motion.p>
                                            {isCorrect && earnedPoints > 0 && (
                                                <motion.p
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.35, type: "spring" }}
                                                    className="text-gradient text-lg font-poppins font-bold"
                                                >
                                                    +{earnedPoints} poin!
                                                </motion.p>
                                            )}
                                            {isCorrect && streak >= 2 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.45 }}
                                                    className="flex items-center justify-center"
                                                >
                                                    <StreakIndicator streak={streak} />
                                                </motion.div>
                                            )}
                                            {!isCorrect && (
                                                <>
                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.4 }}
                                                        className="text-muted-foreground"
                                                    >
                                                        Jawaban benar:{" "}
                                                        <span className="text-foreground font-medium">
                                                            {question.type === "multiple_choice"
                                                                ? question.options.find((o) => o.id === question.correctAnswer)?.text
                                                                : question.correctAnswer}
                                                        </span>
                                                    </motion.p>
                                                    {mode === "survival" && survivalWrongCount === 1 && !eliminated && (
                                                        <motion.p
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: 0.5 }}
                                                            className="text-warning text-sm font-bold"
                                                        >
                                                            ⚠️ Peringatan! Sisa 1 nyawa lagi!
                                                        </motion.p>
                                                    )}
                                                    {mode === "survival" && eliminated && (
                                                        <motion.p
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: 0.5 }}
                                                            className="text-destructive text-sm font-bold"
                                                        >
                                                            💀 Kamu tersingkir dari permainan!
                                                        </motion.p>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
                                    >
                                        <Clock className="w-4 h-4 animate-spin" />
                                        <span>Soal berikutnya akan muncul otomatis...</span>
                                    </motion.div>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Side panel */}
                {(isHost || showResult) && sortedParticipants.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:w-72 shrink-0"
                    >
                        <div className="glass rounded-2xl p-4 space-y-3 sticky top-4">
                            <div className="flex items-center gap-2 text-sm font-poppins font-bold text-foreground">
                                <Trophy className="w-4 h-4 text-primary" />
                                Live Skor
                            </div>
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                {sortedParticipants.slice(0, 8).map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 shadow"
                                    >
                                        <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                                        <span className="text-lg">{p.avatar}</span>
                                        <span className="flex-1 text-sm font-medium text-foreground truncate">{p.name}</span>
                                        <span className="text-xs font-poppins font-bold text-primary">{p.score}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default PlayQuiz;
