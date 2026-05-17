/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { use, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Home, Zap, Crown, BarChart3, Clock, Target, TrendingUp, Check, X, Expand } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { Sounds } from "@/lib/sounds";
import confetti from "canvas-confetti";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";

interface QuestionStat {
  questionText: string;
  totalAnswers: number;
  correctCount: number;
  avgTime: number;
}

const Results = ({ params }: { params: Promise<{ code: string }> }) => {
  const { code } = use(params);
  const router = useRouter();
  const { currentRoom, currentParticipant, loadRoomByCode, isHost } = useQuiz();
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);
  const supaRef = useRef(createClient());
  const [resultMap, setResultMap] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!currentRoom && code) {
      loadRoomByCode(code).then((found) => {
        if (!found) router.push("/");
      });
    }
  }, [code]);

  useEffect(() => {
    (async () => {
      if (currentRoom && !confettiFired) {
        setConfettiFired(true);
        Sounds.fanfare();
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444"],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444"],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    })()
  }, [currentRoom]);

  const borderTop = (i: number) => {
    switch (i) {
      case 0:
        return "bg-gold/20 border-gold";
      case 1:
        return "bg-slate-400/20 border-slate-400";
      case 2:
        return "bg-amber-700/20 border-amber-700";
      default:
        return "bg-secondary border-secondary";
    }
  }

  // Load per-question stats
  useEffect(() => {
    if (!currentRoom) return;
    const loadStats = async () => {
      const supabase = supaRef.current;
      const participantIds = currentRoom.participants.map((p) => p.id);
      const { data } = await supabase
        .from("participant_answers")
        .select("participant_id, question_id, is_correct, time_taken")
        .in("participant_id", participantIds);

      const resultMap: Record<string, Record<string, boolean>> = {}
      const statsMap: Record<string, QuestionStat> = {}

      currentRoom.quiz.questions.forEach((q) => {
        resultMap[q.id] = {}
        statsMap[q.id] = {
          questionText: q.text,
          totalAnswers: 0,
          correctCount: 0,
          avgTime: 0,
        }
      })

      data?.forEach((row) => {
        resultMap[row.question_id][row.participant_id] = row.is_correct

        const stat = statsMap[row.question_id]
        stat.totalAnswers++
        if (row.is_correct) stat.correctCount++
        stat.avgTime += Number(row.time_taken)
      })

      const finalStats = Object.values(statsMap).map((s) => ({
        ...s,
        avgTime: s.totalAnswers ? s.avgTime / s.totalAnswers : 0,
      }))

      setResultMap(resultMap)
      setStats(finalStats)
    };
    loadStats();
  }, [currentRoom]);

  const sorted = currentRoom ? [...currentRoom.participants].sort((a, b) => b.score - a.score) : [];
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(0);

  const totalMap = useMemo(() => {
    if (!resultMap || !currentRoom) return {}

    const map: Record<string, number> = {}

    rest.forEach((p) => {
      let total = 0

      currentRoom.quiz.questions.forEach((q) => {
        if (resultMap[q.id]?.[p.id]) total++
      })

      map[p.id] = total
    })

    return map
  }, [resultMap, rest, currentRoom]);

  const podiumOrder = [1, 0, 2];
  const podiumHeights = ["h-28", "h-40", "h-20"];
  const podiumColors = ["from-silver/30 to-silver/10", "from-gold/30 to-gold/10", "from-bronze/30 to-bronze/10"];
  const medals = [
    <Crown key="gold" className="w-8 h-8 text-gold" />,
    <Medal key="silver" className="w-7 h-7 text-silver" />,
    <Medal key="bronze" className="w-6 h-6 text-bronze" />,
  ];

  // Current participant's personal stats
  const myAnswers = currentParticipant?.answers ?? {};
  const myTotal = Object.keys(myAnswers).length;
  const myCorrect = Object.values(myAnswers).filter((a) => a.correct).length;
  const myAvgTime = myTotal > 0 ? Object.values(myAnswers).reduce((s, a) => s + a.time, 0) / myTotal : 0;
  const myAccuracy = myTotal > 0 ? Math.round((myCorrect / myTotal) * 100) : 0;

  const totalCorrectOverall = stats.reduce((s, q) => s + q.correctCount, 0);
  const totalAnswersOverall = stats.reduce((s, q) => s + q.totalAnswers, 0);
  const overallAccuracy = totalAnswersOverall > 0 ? Math.round((totalCorrectOverall / totalAnswersOverall) * 100) : 0;

  if (!currentRoom) return <LoadingScreen />;

  return (
    <div className="min-h-screen quiz-pattern flex flex-col items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-poppins font-bold text-xl text-foreground">QuizArena</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-3xl md:text-4xl font-poppins font-bold text-foreground"
          >
            🏆 Leaderboard 🏆
          </motion.h1>
          <p className="text-muted-foreground">{currentRoom.quiz.title}</p>
          <p className="text-xs text-muted-foreground">{currentRoom.participants.length} peserta</p>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-4 pt-8">
            {podiumOrder.map((rank, posIdx) => {
              const player = top3[rank];
              if (!player) return <div key={posIdx} className="w-28" />;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + posIdx * 0.2, type: "spring", stiffness: 150 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ delay: 1 + posIdx * 0.2, duration: 2, repeat: Infinity }}
                    className="mb-2"
                  >
                    {medals[rank]}
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + posIdx * 0.2, type: "spring" }}
                    className="text-3xl mb-1"
                  >
                    {player.avatar}
                  </motion.div>
                  <p className="font-poppins font-bold text-foreground text-sm mb-1 text-center">{player.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{player.score} pts</p>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    transition={{ delay: 0.8 + posIdx * 0.2, duration: 0.5 }}
                    className={`w-24 ${podiumHeights[posIdx]} rounded-t-xl bg-linear-to-t ${podiumColors[posIdx]} flex items-center justify-center overflow-hidden`}
                  >
                    <span className="text-2xl font-poppins font-bold text-foreground">#{rank + 1}</span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rest in table */}
        {isHost && rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="glass rounded-2xl shadow overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="sticky left-0 z-20 w-16 bg-[#0e1525] text-center text-muted-foreground">Peringkat</TableHead>
                  <TableHead className="sticky left-20 z-20 bg-[#0e1525] text-muted-foreground">Peserta</TableHead>
                  {currentRoom.quiz.questions.map((q, i) => (
                    <TableHead className="text-center text-muted-foreground" key={q.id}>S{i + 1}</TableHead>
                  ))}
                  <TableHead className="text-center text-muted-foreground">Total</TableHead>
                  <TableHead className="text-center text-muted-foreground">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + i * 0.08 }}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell className="sticky left-0 z-10 bg-[#0e1525] text-center font-poppins font-bold text-muted-foreground">
                      #{i + 1}
                    </TableCell>
                    <TableCell className="sticky left-20 z-10 bg-[#0e1525]">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 ${borderTop(i)} rounded-full border flex items-center justify-center text-lg`}>
                          {p.avatar}
                        </span>
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </TableCell>
                    {resultMap && currentRoom.quiz.questions.map((q) => {
                      const correct = resultMap[q.id]?.[p.id]

                      return (
                        <TableCell key={q.id} className="text-center">
                          {correct === true && <Check className="text-green-500 w-5 h-5" />}
                          {correct === false && <X className="text-destructive w-5 h-5" />}
                          {correct === undefined && <span className="text-muted-foreground w-5 h-5">-</span>}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-poppins font-bold text-muted-foreground">
                      {totalMap[p.id]}/{currentRoom.quiz.questions.length}
                    </TableCell>
                    <TableCell className="text-center font-poppins font-bold text-primary">
                      {p.score} pts
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        {rest.length === 0 && sorted.length <= 3 && sorted.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="glass rounded-2xl p-4 text-center shadow text-muted-foreground text-sm"
          >
            Semua peserta ditampilkan di podium!
          </motion.div>
        )}

        {/* Personal Stats (for participants) */}
        {currentParticipant && myTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="glass rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-poppins font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Statistik Kamu
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <Target className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-2xl font-poppins font-bold text-foreground">{myAccuracy}%</p>
                <p className="text-xs text-muted-foreground">Akurasi</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <Clock className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-poppins font-bold text-foreground">{myAvgTime.toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground">Rata-rata Waktu</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-secondary/50">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-gold" />
                <p className="text-2xl font-poppins font-bold text-foreground">{myCorrect}/{myTotal}</p>
                <p className="text-xs text-muted-foreground">Benar</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Toggle detailed stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-center"
        >
          <Button
            variant="primaryOutliner"
            onClick={() => setShowStats(!showStats)}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {showStats ? "Sembunyikan" : "Lihat"} Statistik Per Soal
          </Button>
        </motion.div>

        {/* Per-question stats */}
        {showStats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {stats.map((q, i) => {
              const accuracy = q.totalAnswers > 0 ? Math.round((q.correctCount / q.totalAnswers) * 100) : 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Soal {i + 1}</p>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{q.questionText}</p>
                    </div>
                    <span className={`text-sm font-poppins font-bold ${accuracy >= 70 ? "text-success" : accuracy >= 40 ? "text-warning" : "text-destructive"}`}>
                      {accuracy}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>✅ {q.correctCount}/{q.totalAnswers} benar</span>
                    <span>⏱ {q.avgTime.toFixed(1)}s rata-rata</span>
                  </div>
                  {/* Accuracy bar */}
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${accuracy}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
                      className={`h-full rounded-full ${accuracy >= 70 ? "bg-green-500" : accuracy >= 40 ? "bg-yellow-600" : "bg-destructive"}`}
                    />
                  </div>
                </motion.div>
              );
            })}

            {/* Overall stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stats.length * 0.08 + 0.3 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className="text-sm text-muted-foreground">Akurasi keseluruhan quiz</p>
              <p className="text-3xl font-poppins font-bold text-foreground">{overallAccuracy}%</p>
            </motion.div>
          </motion.div>
        )}

        {/* Back button */}
        <div className="text-center pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              variant={'primary'} className="cursor-pointer"
              onClick={() => router.push("/")}
            >
              <Home className="w-5 h-5 mr-2" />
              Kembali ke Beranda
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Results;
