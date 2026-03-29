"use client";

import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CircleSlash2, CircleStar, FileQuestion, History, Key, Logs, Search, Settings2, ShieldCheck, Timer, TriangleAlert, User, Zap } from "lucide-react";
import { Logs as Logss, Users, useAdmin } from "@/hooks/useAdmin";
import LoadingScreen from "@/components/LoadingScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// ── Mock Data ──────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────
const roleColors = {
    admin: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    user: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

type RoleColors = "admin" | "user";

const statusColors = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    suspend: "bg-destructive/20 text-destructive border-destructive/30",
};

type StatusColors = "active" | "suspend";

const severityColors = {
    info: { dot: "bg-primary", row: "" },
    warning: { dot: "bg-amber-400", row: "bg-amber-500/[0.04]" },
    danger: { dot: "bg-destructive", row: "bg-destructive/[0.06]" },
};

type SeverityColors = "info" | "warning" | "danger";

const logTypeIcon = {
    auth: <Key className="w-4 h-4 text-yellow-500" />,
    quiz: <Zap className="w-4 h-4 text-primary" />,
    security: <ShieldCheck className="w-4 h-4 text-blue-500" />,
    admin: <Settings2 className="w-4 h-4 text-muted-foreground" />,
};

type LogTypeIcon = "auth" | "quiz" | "security" | "admin";

const avatarColors = [
    "from-blue-500 to-blue-700",
    "from-violet-500 to-violet-700",
    "from-teal-500 to-teal-700",
    "from-rose-500 to-rose-700",
    "from-amber-500 to-amber-700",
    "from-emerald-500 to-emerald-700",
];

interface TypeStats {
    label: string;
    value: number;
    icon: ReactElement;
    color: string;
}

// ── Stats ──────────────────────────────────────────────────
const stats: TypeStats[] = [
    { label: "Total Pengguna", value: 6, icon: <User className="mb-2 text-primary w-9 h-9" />, color: "blue" },
    { label: "Total Quiz", value: 3, icon: <Zap className="mb-2 text-violet-500 w-9 h-9" />, color: "violet" },
    { label: "Akun Suspended", value: 1, icon: <CircleSlash2 className="mb-2 text-destructive w-9 h-9" />, color: "red" },
    { label: "Perlu Review", value: 2, icon: <TriangleAlert className="mb-2 text-amber-500 w-9 h-9" />, color: "amber" },
];

const statStyle = {
    blue: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", glow: "shadow-[0_0_20px_rgba(59,130,246,0.08)]" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", glow: "shadow-[0_0_20px_rgba(139,92,246,0.08)]" },
    red: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", glow: "" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", glow: "" },
};


type StatColor = "blue" | "violet" | "red" | "amber";

// ══════════════════════════════════════════════════════════
export default function AdminPage() {
    const { quiz, users, logs, loading, loadingQuiz, loadingUser, loadQuiz, loadUsers } = useAdmin();
    const { profile, updateLog } = useAuth();
    const [activeTab, setActiveTab] = useState("users");
    const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState("");
    const [quizSearch, setQuizSearch] = useState("");
    const [logFilter, setLogFilter] = useState("all");
    const [selectedIdQuiz, setSelectedIdQuiz] = useState<string | null>(null);
    const supaRef = useRef(createClient());
    const router = useRouter();

    useEffect(() => {
        (async () => {
            if (profile && profile.role !== "admin") {
                await updateLog({ type: "auth", action: "Ada yang mencoba mengakses halaman admin!", user: profile?.nama_lengkap ?? "uknown", severity: "danger" })
                toastError("Khusus halaman admin, anda melanggar aturan!");
                router.push("/");
            }
        })()
    }, [profile]);

    const filteredUsers = useMemo(() => {
        return users.filter(
            (u: Users) =>
                u?.nama_lengkap?.toLowerCase().includes(userSearch.toLowerCase()) ||
                u?.email?.toLowerCase().includes(userSearch.toLowerCase()))
    }, [users, userSearch]);

    const filteredQuizzes = useMemo(() => {
        return quiz.filter((q) => q.title.toLowerCase().includes(quizSearch.toLowerCase()))
    }, [quiz, quizSearch]);

    const filteredLogs = useMemo(() => {
        return logFilter === "all" ? logs : logs.filter((l: Logss) => l.severity === logFilter || l.type === logFilter);
    }, [logs, logFilter]);

    const stat = useMemo(() => [
        { ...stats[0], value: users.length },
        { ...stats[1], value: quiz.length },
        { ...stats[2], value: users.filter(u => u.status === "suspend").length },
        { ...stats[3], value: quiz.length }
    ], [users, quiz]);

    const toggleSuspend = async (id: string, status: "active" | "suspend") => {
        const supabase = supaRef.current;
        try {
            const { error } = await supabase.from("profiles")
                .update({ status: status === "active" ? "suspend" : "active" })
                .eq("id_user", id);
            if (error) throw Error("Data user gagal diubah");
            toastSuccess("Data user berhasil diubah");
            await loadUsers();
        } catch (error) {
            toastError("Data user gagal diubah");
        }
    };

    const handleDeleteQuiz = async (id: string) => {
        const supabase = supaRef.current;
        try {
            const { error } = await supabase.from("quizzes").delete().eq("id", id);
            if (error) throw Error("Gagal menghapus quiz");
            toastSuccess("Quiz berhasil dihapus");
            await loadQuiz();
        } catch (error) {
            toastError("Gagal menghapus quiz");
        } finally {
            setSelectedIdQuiz(null);
        }
    }

    const optionLabel = ["A", "B", "C", "D"];

    const tabs = [
        { id: "users", label: "Kelola Akun", icon: <User className="w-6 h-6 sm:w-4 sm:h-4" /> },
        { id: "logs", label: "Log Aktivitas", icon: <Logs className="w-6 h-6 sm:w-4 sm:h-4" /> },
        { id: "quizzes", label: "Moderasi Quiz", icon: <Zap className="w-6 h-6 sm:w-4 sm:h-4" /> },
    ];

    if (loading || profile?.role !== "admin") return <LoadingScreen />

    return (
        <div className="min-h-screen quiz-pattern relative overflow-hidden">
            {/* EFEK GLOW */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary/10  blur-[120px]" />
                <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-primary/3 blur-[200px]" />
            </div>

            {/* MODAL DELETE */}
            <AnimatePresence mode="wait">
                {selectedIdQuiz && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedIdQuiz(null)}
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
                            <p className="text-muted-foreground">Anda yakin ingin menghapus quiz ini?</p>
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => handleDeleteQuiz(selectedIdQuiz)}
                                >
                                    Hapus
                                </Button>
                                <Button size="sm" className="cursor-pointer" variant="primary" onClick={() => setSelectedIdQuiz(null)}>
                                    Batal
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Navbar ── */}
            <header className="flex bg-primary/5 items-center gap-4 px-6 py-4 border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Settings2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-poppins font-bold text-foreground">Admin</span>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="relative z-10 max-w-5xl mx-auto px-5 mt-8 pb-20">

                {/* Page Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-[0.7rem] font-bold tracking-widest uppercase text-primary mb-3">
                        ⚙️ Admin Panel
                    </div>
                    <h1 className="font-extrabold text-3xl sm:text-4xl tracking-tight mb-1">
                        Manajemen <span className="text-primary">Sistem</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">Kelola pengguna, pantau aktivitas, dan moderasi konten quiz.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {stat.map((s) => {
                        const st = statStyle[s.color as StatColor];
                        return (
                            <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-6 ${st.bg} ${st.border} ${st.glow}`}>
                                {s.icon}
                                <div className="flex-1">
                                    <div className={`font-extrabold text-2xl ${st.text} leading-none mb-1`}>{s.value}</div>
                                    <div className="text-xs text-slate-500">{s.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1.5 mb-6 p-1 bg-primary/5 border border-primary/30 rounded-2xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                ? "bg-primary text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                                : "text-muted-foreground hover:text-slate-300"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── TAB: USERS ── */}
                {activeTab === "users" && (
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
                            <input
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Cari pengguna berdasarkan nama atau email..."
                                className="w-full bg-[#0d1520] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                        </div>

                        {/* Table header */}
                        <div className="px-5 py-2 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">
                            <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_80px] gap-4 items-center">
                                <span>Pengguna</span>
                                <span>Email</span>
                                <span className="text-center">Role</span>
                                <span className="text-center">Quiz</span>
                                <span className="text-center">Status</span>
                                <span className="text-center">Aksi</span>
                            </div>
                        </div>

                        {loadingUser ?
                            <div className="text-center py-16">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"
                                />
                                <p className="text-muted-foreground mt-4 animate-pulse">Memuat quiz...</p>
                            </div>
                            :
                            filteredUsers.map((u, i) => (
                                <div
                                    key={u.id_user}
                                    className="bg-primary/5 border border-primary/10 rounded-2xl px-5 py-4 hover:border-primary/30 transition-all"
                                >
                                    {/* Mobile layout */}
                                    <div className="flex items-center gap-3 sm:hidden mb-3">
                                        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${u.avatar_url ?? avatarColors[i % avatarColors.length]} flex items-center justify-center text-xs font-extrabold shrink-0`}>
                                            {u.avatar_url && <Avatar className="size-full text-lg font-poppins font-bold">
                                                <AvatarImage src={u.avatar_url ?? undefined} alt="" className="object-cover" />
                                                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">Gambar {u.nama_lengkap}</AvatarFallback>
                                            </Avatar>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white">{u.nama_lengkap}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </div>
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-xs font-extrabold shrink-0`}>
                                                {u.avatar_url && <Avatar className="size-28 sm:size-10 text-lg font-poppins font-bold">
                                                    <AvatarImage src={u.avatar_url ?? undefined} alt="" className="object-cover" />
                                                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">Gambar {u.nama_lengkap}</AvatarFallback>
                                                </Avatar>}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground">{u.nama_lengkap}</div>
                                                <div className="text-xs text-slate-600">{new Date(u.created_at).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                                        <div className="text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[0.7rem] font-bold border ${roleColors[u.role as RoleColors]}`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-300 font-medium text-center">{u.quizzes}</div>
                                        <div className="text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[0.7rem] font-bold border ${statusColors[u.status as StatusColors]}`}>
                                                {u.status === "active" ? "Aktif" : "Suspended"}
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            {u.role !== "admin" ? (
                                                <button
                                                    onClick={() => toggleSuspend(u.id_user, u.status)}
                                                    className={`px-3 cursor-pointer py-1.5 rounded-lg text-[0.72rem] font-bold border transition-all ${u.status === "active"
                                                        ? "border-destructive/30 text-destructive bg-destructive/20 hover:bg-red-500/10"
                                                        : "border-emerald-500/30 text-emerald-400 bg-emerald-400/20 hover:bg-emerald-500/10"
                                                        }`}
                                                >
                                                    {u.status === "active" ? "Suspend" : "Aktifkan"}
                                                </button>
                                            ) : (
                                                <button
                                                    className={`px-3 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-all bg-muted text-muted-foreground`}
                                                >
                                                    No Action
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile actions */}
                                    <div className="flex items-center gap-2 sm:hidden flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[0.7rem] font-bold border ${roleColors[u.role as RoleColors]}`}>{u.role}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[0.7rem] font-bold border ${statusColors[u.status as StatusColors]}`}>
                                            {u.status === "active" ? "Aktif" : "Suspended"}
                                        </span>
                                        <span className="text-xs text-slate-500">{u.quizzes} quiz</span>
                                        {u.role !== "admin" && (
                                            <button
                                                // onClick={() => toggleSuspend(u.id)}
                                                className={`ml-auto px-3 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-all ${u.status === "active"
                                                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                    }`}
                                            >
                                                {u.status === "active" ? "Suspend" : "Aktifkan"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-16 text-muted-foreground">
                                <div className="text-4xl mb-3"><Search className="w-8 h-8 mx-auto" /></div>
                                <div className="text-sm">Tidak ada pengguna ditemukan</div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: LOGS ── */}
                {activeTab === "logs" && (
                    <div className="space-y-4">
                        {/* Filter chips */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { id: "all", label: "Semua" },
                                { id: "info", label: "Info" },
                                { id: "warning", label: "Warning" },
                                { id: "danger", label: "Bahaya" },
                                { id: "security", label: "Keamanan" },
                                { id: "auth", label: "Auth" },
                                { id: "quiz", label: "Quiz" },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setLogFilter(f.id)}
                                    className={`px-3.5 py-1.5 rounded-lg text-[0.75rem] font-bold border transition-all ${logFilter === f.id
                                        ? "bg-primary/20 border-primary/40 text-primary"
                                        : "border-white/7 text-muted-foreground hover:border-white/20 hover:text-muted-foreground/50"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Log entries */}
                        <div className="bg-primary/1 border border-white/6 rounded-2xl overflow-hidden">
                            {filteredLogs.map((log, i) => {
                                const s = severityColors[log.severity as SeverityColors];
                                return (
                                    <div
                                        key={log.id}
                                        className={`flex items-start gap-4 px-5 py-3.5 ${s.row} ${i !== 0 ? "border-t border-white/4" : ""
                                            } transition-all hover:bg-white/2`}
                                    >
                                        {/* severity dot */}
                                        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${s.dot} shadow-[0_0_6px_currentColor]`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-base">{logTypeIcon[log.type as LogTypeIcon]}</span>
                                                <span className="text-sm font-medium text-white">{log.action}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <p className="flex items-center gap-1 text-xs text-muted-foreground"><User className="w-3 h-3" /> {log.user}</p>
                                                {/* <p className="flex items-center gap-1 text-xs text-primary"><Globe2 className="w-3 h-3" /> <span className="text-muted-foreground">{log.ip}</span></p> */}
                                            </div>
                                        </div>

                                        <div className="text-[0.72rem] text-muted-foreground shrink-0 text-right">
                                            {new Date(log.time).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredLogs.length === 0 && (
                                <div className="text-center py-16 text-muted-foreground">
                                    <div className="text-4xl mb-3"><Logs className="w-8 h-8 mx-auto" /></div>
                                    <div className="text-sm">Tidak ada log ditemukan</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: QUIZZES ── */}
                {activeTab === "quizzes" && (
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm">🔍</span>
                            <input
                                value={quizSearch}
                                onChange={(e) => setQuizSearch(e.target.value)}
                                placeholder="Cari quiz berdasarkan judul atau pembuat..."
                                className="w-full bg-[#0d1520] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                        </div>

                        {loadingQuiz ?
                            <div className="text-center py-16">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"
                                />
                                <p className="text-muted-foreground mt-4 animate-pulse">Memuat quiz...</p>
                            </div>
                            :
                            filteredQuizzes.map((quiz) => {
                                const isExpanded = expandedQuiz === quiz.id;
                                return (
                                    <div
                                        key={quiz.id}
                                        className={`bg-primary/5 border rounded-2xl overflow-hidden transition-all duration-300 border-white/6 hover:border-primary/40`}>
                                        {/* Quiz header */}
                                        <div
                                            className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                                            onClick={() => setExpandedQuiz(isExpanded ? null : quiz.id)}
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                                                <Zap className="w-6 h-6 text-primary-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col items-start mb-2">
                                                    <span className="font-bold text-sm">{quiz.title}</span>
                                                    <p className="text-xs text-muted-foreground md:w-3/4">{quiz.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {quiz.user}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> {new Date(quiz.created_at).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1"><FileQuestion className="w-3 h-3 text-destructive" /> {quiz.jumlah_soal} soal</span>
                                                    <span className="flex items-center gap-1"><History className="w-3 h-3 text-cyan-500" /> {quiz.jumlah_sesi} sesi</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedIdQuiz(quiz.id); }}
                                                    className="px-3 py-1.5 border border-destructive/25 bg-destructive/20 text-destructive rounded-lg text-[0.72rem] font-bold hover:bg-destructive/30 transition-all">
                                                    Hapus
                                                </button>
                                                <span className={`text-xs text-slate-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                                    ▼
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded questions */}
                                        <div
                                            className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="border-t border-white/5 px-5 py-4 space-y-3">
                                                    <div className="text-[0.72rem] font-bold uppercase tracking-widest text-slate-600 mb-2">
                                                        Daftar Pertanyaan
                                                    </div>
                                                    {quiz.questions.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`rounded-xl p-4 border transition-all bg-primary/5`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[0.65rem] font-bold shrink-0 mt-0.5 bg-primary/20 text-primary`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-start justify-between gap-6 mb-2">
                                                                        {item.image_url ? <motion.img
                                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            src={item.image_url}
                                                                            alt="Question"
                                                                            className="max-h-48 mx-auto border border-primary/30 rounded-xl mb-4 object-contain"
                                                                        /> : <span className="text-sm text-white font-medium">{item.question}</span>}
                                                                        <div className="space-x-2 text-xs text-muted-foreground shrink-0">
                                                                            <span className="inline-flex items-center gap-1"><CircleStar className="w-3 h-3 text-gold" /> {item.points}</span>
                                                                            <span className="inline-flex items-center gap-1"><Timer className="w-3 h-3 text-primary" /> {item.time_limit}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        {item.type === "multiple_choice" ? item.options.map((ans, ai) => (
                                                                            <div
                                                                                key={ai}
                                                                                className={`flex items-center gap-2 p-4 rounded-lg text-sm border transition-all ${ans.id === item.correct
                                                                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium"
                                                                                    : "bg-white/3 border-white/3 text-muted-foreground"
                                                                                    }`}
                                                                            >
                                                                                <span className={`inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full ${ans.id === item.correct ? "bg-emerald-500/30" : "bg-muted-foreground/30"} `}>{optionLabel[ai]}</span>
                                                                                {ans.id === item.correct && "✓ "}{ans.text}
                                                                            </div>
                                                                        ))
                                                                            :
                                                                            (
                                                                                <div
                                                                                    className={`col-span-2 p-4 rounded-lg text-sm border transition-all bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium`}
                                                                                >
                                                                                    {item.correct}
                                                                                </div>
                                                                            )
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {filteredQuizzes.length === 0 && (
                            <div className="text-center py-16 text-muted-foreground">
                                <div className="text-4xl mb-3"><Search className="w-8 h-8 mx-auto" /></div>
                                <div className="text-sm">Tidak ada pengguna ditemukan</div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}