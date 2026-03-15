/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef, useMemo, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Swords, Heart, Shield, Check, X, Loader2, Trophy, Clock, MessageSquare } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sounds } from "@/lib/sounds";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import Image from "next/image";
import { toastSuccess } from "@/lib/toast";

const BATTLE_DURATION = 500;
const ATTACK_COOLDOWN = 2000;
const DAMAGE_INTERVAL = 2000;
const DAMAGE_PER_HIT = 10;
const DAMAGE_MANUAL = 5;
const QUESTIONS_TO_WIN = 10;
const CHARACTER_SKINS = ["⚔️🦊", "🗡️🐱", "🏹🐶", "🔮🐸", "⚡🦁", "🛡️🐼", "💣🐨", "🔥🐯", "✨🦄", "🌊🐙"];

interface BattleParticipant {
  id: string;
  name: string;
  avatar: string;
  hp: number;
  score: number;
  correctAnswers: number;
  isEliminated: boolean;
  gridX: number;
  gridY: number;
  posX: number;
  posY: number;
}

interface AttackAnimation {
  id: string;
  attackerId: string;
  targetId: string;
  timestamp: number;
}

const BattleArena = ({ params }: { params: Promise<{ code: string }> }) => {
  const { code } = use(params);
  const router = useRouter();
  const { currentRoom, currentParticipant, isHost, loadRoomByCode, restoreParticipantSession } = useQuiz();

  const [battleParticipants, setBattleParticipants] = useState<BattleParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<BattleParticipant | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [battleTimeLeft, setBattleTimeLeft] = useState(BATTLE_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<BattleParticipant | null>(null);
  const [attackAnimations, setAttackAnimations] = useState<AttackAnimation[]>([]);
  const [lastAttackTime, setLastAttackTime] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [myCorrectCount, setMyCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAllowedPunch, setIsAllowedPunch] = useState(false);
  const [streakAnswer, setStreakAnswer] = useState(0);

  const battleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const battleStartRef = useRef<number>(0);
  const subscriptionRef = useRef<any[]>([]);
  const supaRef = useRef(createClient());

  const questions = currentRoom?.quiz.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  // Initialize battle
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (!currentParticipant) await restoreParticipantSession();
      if (!currentRoom && code) {
        const found = await loadRoomByCode(code);
        if (!found) { router.push("/"); return; }
      }
      setLoading(false);
    };
    init();
  }, [code]);

  // ATTACK GLOBAL
  useEffect(() => {
    if (!currentRoom || gameOver) return

    const supabase = supaRef.current
    const interval = setInterval(async () => {
      const alive = battleParticipants.filter(p => !p.isEliminated)

      for (const p of alive) {
        const newHp = Math.max(0, p.hp - DAMAGE_PER_HIT)
        await supabase
          .from("session_participants")
          .update({
            hp: newHp,
            is_eliminated: newHp <= 0
          })
          .eq("id", p.id);
      }

    }, DAMAGE_INTERVAL);
    return () => clearInterval(interval)
  }, [battleParticipants, gameOver, currentRoom]);


  // Setup participants with grid positions
  useEffect(() => {
    if (!currentRoom) return;
    const cols = Math.ceil(Math.sqrt(currentRoom.participants.length + 1));
    const participants: BattleParticipant[] = currentRoom.participants.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      hp: 100,
      score: p.score,
      correctAnswers: 0,
      isEliminated: false,
      gridX: (i % cols) * 1 + Math.random() * 0.3,
      gridY: Math.floor(i / cols) * 1 + Math.random() * 0.3,
      posX: 0,
      posY: 0

    }));
    (async () => {
      setBattleParticipants(participants);
      if (currentParticipant) {
        const me = participants.find(p => p.id === currentParticipant.id);
        setMyParticipant(me || null);
      }
    })();
    battleStartRef.current = Date.now();
  }, [currentRoom?.participants.length]);

  // Subscribe to battle attacks realtime
  useEffect(() => {
    if (!currentRoom) return;
    const supabase = supaRef.current;
    const channel = supabase
      .channel(`battle-attacks-${currentRoom.sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "battle_attacks",
        filter: `session_id=eq.${currentRoom.sessionId}`,
      }, (payload) => {
        const attack = payload.new as any;
        // Show attack animation
        setAttackAnimations(prev => [...prev, {
          id: attack.id,
          attackerId: attack.attacker_id,
          targetId: attack.target_id,
          timestamp: Date.now(),
        }]);
        // Remove animation after 1s
        setTimeout(() => {
          setAttackAnimations(prev => prev.filter(a => a.id !== attack.id));
        }, 1000);
        // Update target HP
        setBattleParticipants(prev => prev.map(p => {
          if (p.id === attack.target_id) {
            const newHp = Math.max(0, p.hp - attack.damage);
            return { ...p, hp: newHp, isEliminated: newHp <= 0 };
          }
          return p;
        }));
        // Update my participant
        if (currentParticipant && attack.target_id === currentParticipant.id) {
          setMyParticipant(prev => {
            if (!prev) return prev;
            const newHp = Math.max(0, prev.hp - attack.damage);
            if (newHp <= 0) {
              Sounds.wrong();
              toast.error("Kamu tereliminasi! 💀");
            } else {
              Sounds.tickUrgent();
            }
            return { ...prev, hp: newHp, isEliminated: newHp <= 0 };
          });
        }
        // Play sound for attacker
        if (currentParticipant && attack.attacker_id === currentParticipant.id) {
          Sounds.whoosh();
        }
      })
      .subscribe();

    // Subscribe to HP updates on session_participants
    const hpChannel = supabase
      .channel(`battle-hp-${currentRoom.sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "session_participants",
        filter: `session_id=eq.${currentRoom.sessionId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setBattleParticipants(prev => prev.map(p => {
          if (p.id === updated.id) {

            if (currentParticipant && updated.id === currentParticipant.id) {
              return {
                ...p,
                hp: updated.hp,
                score: updated.score,
                isEliminated: updated.hp <= 0 || updated.is_eliminated,
                posX: updated.pos_x,
                posY: updated.pos_y
              }
            }

            return {
              ...p,
              hp: updated.hp,
              score: updated.score,
              isEliminated: updated.hp <= 0 || updated.is_eliminated,
              posX: updated.pos_x,
              posY: updated.pos_y
            }
          }
          return p;
        }));
      })
      .subscribe();

    subscriptionRef.current.push(channel, hpChannel);
    return () => {
      subscriptionRef.current.forEach(ch => supabase.removeChannel(ch));
      subscriptionRef.current = [];
    };
  }, [currentRoom?.sessionId]);

  const handleGameEnd = useCallback(async () => {
    if (gameOver) return;
    setGameOver(true);

    // Determine winner
    const alive = battleParticipants.filter(p => !p.isEliminated);
    let w: BattleParticipant | null = null;
    if (myCorrectCount >= QUESTIONS_TO_WIN && myParticipant) {
      w = myParticipant;
    } else if (alive.length === 1) {
      w = alive[0];
    } else {
      // Highest score wins
      w = [...battleParticipants].sort((a, b) => b.score - a.score)[0] || null;
    }
    setWinner(w);

    if (isHost) {
      const supabase = supaRef.current;
      await supabase
        .from("quiz_sessions")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", currentRoom?.sessionId);
    }

    Sounds.correct();
  }, [gameOver, battleParticipants, myCorrectCount, myParticipant, isHost, currentRoom]);

  // Battle timer
  useEffect(() => {
    if (!currentRoom || gameOver || loading) return;
    battleTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (currentRoom.questionStartTime || Date.now())) / 1000);
      const remaining = Math.max(0, BATTLE_DURATION - elapsed);
      setBattleTimeLeft(remaining);
      if (remaining <= 0 && !gameOver) {
        (async () => {
          await handleGameEnd();
        })();
      }
    }, 1000);
    return () => { if (battleTimerRef.current) clearInterval(battleTimerRef.current); };
  }, [currentRoom?.questionStartTime, gameOver, loading]);

  const performAttack = useCallback(async (targetId: string) => {
    if (!currentRoom || !currentParticipant || gameOver) return;
    const now = Date.now();
    if (now - lastAttackTime < ATTACK_COOLDOWN) return;
    setLastAttackTime(now);

    // Insert attack record
    const supabase = supaRef.current;
    await supabase.rpc("perform_battle_attack", {
      p_session: currentRoom.sessionId,
      p_attacker: currentParticipant.id,
      p_target: targetId,
      p_damage: DAMAGE_PER_HIT
    });

  }, [currentRoom, currentParticipant, lastAttackTime, gameOver]);

  // Check win condition
  useEffect(() => {
    if (gameOver) return;
    // Check if someone answered 10 correctly
    if (myCorrectCount >= QUESTIONS_TO_WIN) {
      (async () => {
        await handleGameEnd();
      })();
      return;
    }
    // Check if only one alive
    const alive = battleParticipants.filter(p => !p.isEliminated);
    if (alive.length <= 1 && battleParticipants.length > 1) {
      (async () => {
        await handleGameEnd();
      })();
    }
  }, [myCorrectCount, battleParticipants]);

  // Listen for game end from session status
  useEffect(() => {
    (async () => {
      if (currentRoom?.status === "finished") {
        const timeout = setTimeout(() => {
          setGameOver(true);
          router.push(`/results/${code}`);
          clearTimeout(timeout);
        }, 5000);
        return () => clearTimeout(timeout);
      }
    })();
  }, [currentRoom?.status]);


  const handleManualAttack = useCallback((targetId: string) => {
    if (!myParticipant || myParticipant.isEliminated || gameOver) return;
    const me = battleParticipants.find(p => p.id === myParticipant.id)
    const target = battleParticipants.find(p => p.id === targetId)
    if (!me || !target ) return;
    if(!isAllowedPunch) return;

    performAttack(targetId);
    setSelectedTarget(targetId);
    setTimeout(() => setSelectedTarget(null), 300);
    setIsAllowedPunch(false);
  }, [myParticipant, gameOver, performAttack, battleParticipants, isAllowedPunch]);

  const openQuestionModal = useCallback(() => {
    if (!myParticipant || myParticipant.isEliminated || gameOver) return;
    if (currentQuestionIdx >= questions.length) {
      toast.info("Semua soal sudah dijawab!");
      return;
    }
    setShowQuestionModal(true);
    setSelectedAnswer(null);
    setShortAnswer("");
    setAnswered(false);
    setAnswerResult(null);
  }, [myParticipant, gameOver, currentQuestionIdx, questions.length]);

  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (answered || !currentQuestion || !currentParticipant || !currentRoom) return;
    setAnswered(true);

    let correct = false;
    if (currentQuestion.type === "multiple_choice") {
      correct = answer === currentQuestion.correctAnswer;
    } else {
      correct = answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    }

    const supabase = supaRef.current;
    const points = correct ? currentQuestion.points : 0;
    setAnswerResult({ correct, points });

    if (correct) {
      Sounds.correct();
      const newCount = myCorrectCount + 1;
      setMyCorrectCount(newCount);

      // Update score in DB
      await supabase
        .from("session_participants")
        .update({ score: (myParticipant?.score || 0) + points })
        .eq("id", currentParticipant.id);

      // Save answer
      await supabase.from("participant_answers").insert({
        participant_id: currentParticipant.id,
        question_id: currentQuestion.id,
        answer,
        time_taken: 0,
        is_correct: true,
        points_earned: points,
      });

      await supabase
        .from("session_participants")
        .update({
          hp: Math.min((myParticipant?.hp || 0) + 15, 100),
          score: (myParticipant?.score || 0) + points
        })
        .eq("id", currentParticipant.id)
      setStreakAnswer((prev) => {
        if(prev % 2 == 0 && prev != 0) {
          setIsAllowedPunch(true);
          toastSuccess("Anda dapat memukul 1x pemain!");
        };
        return prev + 1;
      });
      setMyParticipant(prev => prev ? { ...prev, hp: Math.min(prev.hp + 15, 100), score: prev.score + points, correctAnswers: prev.correctAnswers + 1 } : prev);
    } else {
      Sounds.wrong();
      // Save wrong answer
      await supabase.from("participant_answers").insert({
        participant_id: currentParticipant.id,
        question_id: currentQuestion.id,
        answer,
        time_taken: 0,
        is_correct: false,
        points_earned: 0,
      });
    }

    // Move to next question after delay
    setTimeout(() => {
      setCurrentQuestionIdx(prev => prev + 1);
      setShowQuestionModal(false);
      setAnswered(false);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setShortAnswer("");
    }, 1500);
  }, [answered, currentQuestion, currentParticipant, currentRoom, myCorrectCount, myParticipant]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const optionColors = [
    "from-primary to-accent",
    "from-[hsl(var(--success))] to-[hsl(142,76%,36%)]",
    "from-accent to-primary",
    "from-destructive to-[hsl(340,82%,52%)]",
  ];

  if (loading || !currentRoom) {
    return (
      <div className="min-h-screen quiz-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Game Over Screen
  if (gameOver && winner) {
    return (
      <div className="min-h-screen quiz-pattern flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-10 max-w-md w-full text-center space-y-6"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-7xl"
          >
            🏆
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground">Battle Selesai!</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">Pemenang</p>
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">{winner.avatar}</span>
              <div className="space-y-1">
                <p className="text-xl font-display font-bold text-gradient">{winner.name}</p>
                <p className="text-sm text-muted-foreground">{winner.score} poin</p>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            {[...battleParticipants].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-primary/10" : "bg-secondary"}`}>
                <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                <span className="text-xl">{p.avatar}</span>
                <span className="flex-1 text-left text-sm font-medium text-foreground">{p.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.isEliminated ? "bg-destructive/20 text-destructive" : "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"}`}>
                  {p.isEliminated ? "💀 KO" : `❤️ ${p.hp}`}
                </span>
                <span className="text-sm font-bold text-foreground">{p.score}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="bg-gradient-primary text-primary-foreground w-full"
            onClick={() => router.push("/")}
          >
            Kembali ke Home
          </Button>
        </motion.div>
      </div>
    );
  }

  const isEliminated = myParticipant?.isEliminated ?? false;
  const canAct = !!myParticipant && !isEliminated && !gameOver;

  return (
    <div className="min-h-screen quiz-pattern flex flex-col overflow-hidden">
      {/* Top HUD */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-3 flex items-center gap-3 border-b border-border/50 glass"
      >
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-destructive" />
          <span className="font-display font-bold text-foreground text-sm">Battle Mode</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
          <Clock className="w-3.5 h-3.5 text-warning" />
          <span className={`font-display font-bold text-sm ${battleTimeLeft <= 30 ? "text-destructive animate-pulse" : "text-foreground"}`}>
            {formatTime(battleTimeLeft)}
          </span>
        </div>

        {myParticipant && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            <span className="text-sm font-bold text-foreground">{myCorrectCount}/{QUESTIONS_TO_WIN}</span>
          </div>
        )}

        {/* HEALT BAR */}
        {/* {myParticipant && (
          <div className="flex items-center gap-2 ml-auto">
            <Heart className={`w-4 h-4 ${myParticipant.hp <= 30 ? "text-destructive animate-pulse" : "text-destructive"}`} />
            <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${myParticipant.hp}%`,
                  background: myParticipant.hp > 50
                    ? "hsl(var(--success))"
                    : myParticipant.hp > 25
                      ? "hsl(var(--warning))"
                      : "hsl(var(--destructive))",
                }}
                animate={{ width: `${myParticipant.hp}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">{myParticipant.hp}</span>
          </div>
        )} */}
      </motion.div>

      {/* Battle Arena Grid */}
      <main className="flex-1 relative p-4 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        {/* Players on grid */}
        <div className="relative w-full h-full flex flex-wrap justify-center items-center gap-4 py-8">
          {battleParticipants.map((p) => {
            const isMe = p.id === myParticipant?.id;
            const isTarget = selectedTarget === p.id;
            const isBeingAttacked = attackAnimations.some(a => a.targetId === p.id);
            const hpPct = p.hp;

            return (
              <motion.div
                key={p.id}
                className={`relative cursor-pointer select-none z-10 ${p.isEliminated ? "opacity-40 grayscale pointer-events-none" : ""}`}
                whileHover={canAct && !isMe ? { scale: 1.1 } : {}}
                whileTap={canAct && !isMe ? { scale: 0.9 } : {}}
                animate={{
                  x: p.posX,
                  y: p.posY
                }}
                transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.5 }}
                onClick={() => !isMe && handleManualAttack(p.id)}
              >

                {/* HP Bar */}
                <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden mb-1 mx-auto">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${hpPct}%` }}
                    style={{
                      background: hpPct > 50
                        ? "hsl(var(--success))"
                        : hpPct > 25
                          ? "hsl(var(--warning))"
                          : "hsl(var(--destructive))",
                    }}
                  />
                </div>

                {/* Character */}
                <motion.div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl relative ${isMe
                    ? "ring-2 ring-primary shadow-glow bg-primary/10"
                    : isTarget
                      ? "ring-2 ring-destructive bg-destructive/10"
                      : "bg-secondary hover:bg-secondary/80"
                    }`}
                  animate={isBeingAttacked ? { x: [-6, 6, -6, 6, 0] } : {}}
                  transition={{ duration: 0.25 }}
                // animate={isMe && !isEliminated ? { y: [0, -4, 0] } : {}}
                // transition={isMe ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                  {p.avatar}
                  {p.isEliminated && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
                      <span className="text-2xl">💀</span>
                    </div>
                  )}

                  {/* Attack flash */}
                  <AnimatePresence>
                    {isBeingAttacked && (
                      <motion.div
                        initial={{ opacity: 1, scale: 0.5 }}
                        animate={{ opacity: 0, scale: 2 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="text-3xl">💥</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Damage number */}
                  <AnimatePresence>
                    {isBeingAttacked && (
                      <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -30 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-2 right-0 text-sm font-bold text-destructive"
                      >
                        -{DAMAGE_PER_HIT}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Name & Score */}
                <div className="text-center mt-1">
                  <p className={`text-xs font-medium truncate w-20 ${isMe ? "text-primary" : "text-foreground"}`}>
                    {isMe ? "Kamu" : p.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.score} pts</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Eliminated overlay */}
        {isEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-background/70 z-10"
          >
            <div className="text-center space-y-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl"
              >
                💀
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-destructive">Tereliminasi!</h2>
              <p className="text-muted-foreground">HP kamu habis. Menonton pertarungan...</p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {canAct && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 border-t border-border/50 glass"
        >
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow text-lg py-6"
              onClick={openQuestionModal}
              disabled={currentQuestionIdx >= questions.length}
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {currentQuestionIdx >= questions.length ? "Soal Habis" : `Jawab Soal (${currentQuestionIdx + 1}/${questions.length})`}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Jawab soal untuk menambah HP • Semua pemain menerima damage setiap 2 detik
          </p>
        </motion.div>
      )}

      {/* Question Modal */}
      <AnimatePresence>
        {showQuestionModal && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass rounded-3xl p-6 max-w-lg w-full space-y-5 max-h-[85vh] overflow-y-auto"
            >
              {/* Close button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    Soal {currentQuestionIdx + 1}/{questions.length}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] font-medium">
                    {currentQuestion.points} poin
                  </span>
                </div>
                {!answered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuestionModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Question image */}
              {currentQuestion.imageUrl && (
                <Image
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  className="max-h-40 mx-auto rounded-xl object-contain"
                />
              )}

              {/* Question text */}
              <h3 className="text-xl font-display font-bold text-foreground text-center leading-relaxed">
                {currentQuestion.text}
              </h3>

              {/* Answer result */}
              <AnimatePresence>
                {answerResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-center py-3 rounded-xl ${answerResult.correct
                      ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                      : "bg-destructive/10 text-destructive"
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {answerResult.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      <span className="font-bold">
                        {answerResult.correct ? `Benar! +${answerResult.points}` : "Salah!"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Options / Input */}
              {!answered && (
                <>
                  {currentQuestion.type === "multiple_choice" ? (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options.map((opt, i) => (
                        <motion.button
                          key={opt.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedAnswer(opt.id);
                            handleSubmitAnswer(opt.id);
                          }}
                          className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all bg-gradient-to-r ${optionColors[i % 4]} text-primary-foreground`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center text-sm font-bold">
                            {opt.label}
                          </span>
                          <span className="font-medium">{opt.text}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        placeholder="Ketik jawabanmu..."
                        value={shortAnswer}
                        onChange={(e) => setShortAnswer(e.target.value)}
                        className="bg-secondary border-border h-12 text-lg"
                        onKeyDown={(e) => e.key === "Enter" && shortAnswer.trim() && handleSubmitAnswer(shortAnswer)}
                        autoFocus
                      />
                      <Button
                        className="w-full bg-gradient-primary text-primary-foreground"
                        onClick={() => handleSubmitAnswer(shortAnswer)}
                        disabled={!shortAnswer.trim()}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Jawab
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattleArena;
