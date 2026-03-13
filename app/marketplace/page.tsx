"use client"

import { useState, useEffect } from "react";
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
  const { createAndStartSession } = useQuiz();
  const [quizzes, setQuizzes] = useState<MarketplaceQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if(user) fetchQuizzes();
  }, [user]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: quizzesData, error } = await supabase
        .from("quizzes")
        .select("id, title, description, room_code, created_at, id_user, is_public")
        .eq("is_public", true)
        .eq("is_active", true)
        .neq("id_user", user?.id ?? '')
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

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

      setQuizzes(quizzesData.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        room_code: q.room_code,
        created_at: q.created_at,
        id_user: q.id_user,
        question_count: countMap[q.id] || 0,
        creator_name: nameMap[q.id_user] || "Unknown",
      })));
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

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.description || "").toLowerCase().includes(search.toLowerCase()) ||
    q.creator_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen quiz-pattern">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 py-4">
          <Button variant="ghost" className="cursor-pointer" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-poppins font-bold text-foreground">Quiz Marketplace</span>
          </div>
        </div>
      </header>

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
                    onClick={() => handlePlay(quiz)}
                    disabled={startingId === quiz.id}
                  >
                    {startingId === quiz.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Main Quiz Ini
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
