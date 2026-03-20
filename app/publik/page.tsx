/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, ArrowLeft, Users, Clock, Star, Play, Loader2, Globe, Lock, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { toastError } from "@/lib/toast";
import LoadingScreen from "@/components/LoadingScreen";

interface MarketplaceQuiz {
  id: string;
  title: string;
  description: string | null;
  room_code: string;
  created_at: string;
  id_user: string;
  question_count: number;
  creator_name: string;
}

const Marketplace = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createAndStartSession, joinRoom } = useQuiz();
  const [quizzes, setQuizzes] = useState<MarketplaceQuiz[]>([]);
  const [selectQuiz, setSelectQuiz] = useState<MarketplaceQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState<boolean>(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let quizzesData = [];
      if (user) {
        const { data, error } = await supabase
          .from("quizzes")
          .select("*, quiz_sessions(*)")
          .eq("is_public", true)
          .eq("is_active", true)
          .neq("id_user", user?.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        quizzesData = data;
      } else {
        const { data, error } = await supabase
          .from("quizzes")
          .select("*, quiz_sessions(*)")
          .eq("is_public", true)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        quizzesData = data;
      }


      if (!quizzesData || quizzesData.length === 0) {
        setQuizzes([]);
        setLoading(false);
        return;
      }

      // Get question counts
      const quizIds = quizzesData.map(q => q.id);
      const { data: questions } = await supabase
        .from("questions")
        .select("quiz_id")
        .in("quiz_id", quizIds);

      const countMap: Record<string, number> = {};
      (questions || []).forEach((q) => {
        countMap[q.quiz_id] = (countMap[q.quiz_id] || 0) + 1;
      });

      // Get creator names
      const userIds = [...new Set(quizzesData.map(q => q.id_user))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id_user, nama_lengkap")
        .in("id_user", userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        nameMap[p.id_user] = p.nama_lengkap;
      });

      const quizFiltered = quizzesData.map((q) => ({ ...q, quiz_sessions: q.quiz_sessions.filter((quest: any) => quest.status === "waiting") }));
      setQuizzes([]);
      quizFiltered.forEach(q => {
        setQuizzes((prev) => [...prev, ...q.quiz_sessions.map((quest: any) => {
          return {
            id: q.id,
            title: q.title,
            description: q.description,
            room_code: quest.room_code,
            created_at: q.created_at,
            id_user: q.id_user,
            question_count: countMap[q.id] || 0,
            creator_name: nameMap[q.id_user] || "Unknown",
          }
        })]);
      });

    } catch (err) {
      console.log(err);
      toastError("Gagal memuat quiz!");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (quiz: MarketplaceQuiz) => {
    if (!user) {
      toastError("Login dulu untuk memainkan quiz!");
      router.push("/login");
      return;
    }
    setStartingId(quiz.id);
    try {
      const newCode = await createAndStartSession(quiz.id, quiz.room_code, user.id);
      router.push(`/lobby/${newCode}`);
    } catch (err) {
      console.log(err);
      toastError("Gagal memulai quiz!");
    } finally {
      setStartingId(null);
    }
  };

  const filtered = useMemo(() => {
    return quizzes.filter(q =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.description || "").toLowerCase().includes(search.toLowerCase()) ||
      q.creator_name.toLowerCase().includes(search.toLowerCase())
    )
  }, [quizzes, search]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleJoin = async () => {
    if (!name.trim()) { toastError("Masukkan nama kamu!"); return; }
    if (!selectQuiz) { toastError("Pilih quiz terlebih dahulu!"); return; }
    setJoining(true);
    try {
      const success = await joinRoom(selectQuiz.room_code?.trim().toUpperCase(), name.trim());
      if (success) {
        router.push(`/lobby/${selectQuiz.room_code.trim().toUpperCase()}`);
      } else {
        toastError("Kode game tidak ditemukan atau sudah dimulai!");
      }
    } finally {
      setJoining(false);
    }
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen quiz-pattern">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant={'ghost'} size={'icon'} onClick={() => router.push("/")} className="cursor-pointer">
              <ArrowLeft className="w-6! h-6!" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-poppins font-bold text-foreground">Quiz Publik</span>
          </div>
        </div>
      </header>

      {/* MODAL JOIN ROOM */}
      <AnimatePresence mode="wait">
        {selectQuiz &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectQuiz(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-3xl p-6 max-w-lg w-full space-y-5 max-h-[85vh]"
            >
              <h1 className="text-2xl font-bold font-poppins text-center uppercase">Join Room</h1>
              <Input
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="Masukkan kode game"
                defaultValue={selectQuiz.room_code}
                className="text-center bg-primary/10 text-xl! font-poppins tracking-[0.3em] border-border h-14 uppercase placeholder:text-sm placeholder:tracking-normal"
                maxLength={6}
                disabled
              />
              <Input
                placeholder="Nama kamu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-primary/10 border-border h-12"
                maxLength={20}
              />
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant={'primary'}
                  className="flex-1 group"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? <span className="flex items-center gap-2">Bergabung <Loader2 className="animate-spin" /></span> : "Gabung"}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 bg-destructive hover:bg-destructive/80 cursor-pointer"
                  onClick={() => setSelectQuiz(null)}
                  disabled={joining}
                >
                  Batal
                </Button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl md:text-5xl font-poppins font-bold">
            <span className="text-gradient">Jelajahi</span> Quiz Publik
          </h1>
          <p className="text-muted-foreground max-w-lg text-md mx-auto">
            Temukan dan mainkan quiz yang dibuat oleh komunitas. Cari topik favoritmu!
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-md mx-auto"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cari quiz berdasarkan judul, deskripsi, atau pembuat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-secondary border-border h-12 rounded-xl"
            />
          </div>
        </motion.div>

        {/* Quiz Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10 space-y-4"
          >
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-lg">
              {search ? "Tidak ada quiz yang cocok dengan pencarian" : "Belum ada quiz publik"}
            </p>
            <p className="text-muted-foreground/60 text-sm">
              Buat quiz dan aktifkan opsi Publik&quot; untuk membagikannya di sini!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map((quiz, i) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="glass rounded-2xl p-6 space-y-4 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />

                  <div className="space-y-2 relative z-10">
                    <h3 className="font-poppins font-bold text-lg text-foreground line-clamp-2">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground relative z-10">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {quiz.question_count} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {quiz.creator_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(quiz.created_at)}
                    </span>
                  </div>

                  <Button
                    className="w-full bg-gradient-primary cursor-pointer text-primary-foreground relative z-10"
                    onClick={() => setSelectQuiz(quiz)}
                    disabled={selectQuiz ? true : false}
                  >
                    {selectQuiz ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Join Sekarang
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
