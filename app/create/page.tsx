"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Check, Zap, ListChecks, Type, Loader2, ImagePlus, X, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/hooks/useQuiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import Image from "next/image";
import { toastError, toastSuccess } from "@/lib/toast";

interface LocalOption {
    id: string;
    text: string;
    label: string;
}

interface LocalQuestion {
    id: string;
    type: QuestionType;
    text: string;
    options: LocalOption[];
    correctAnswer: string;
    timeLimit: number;
    points: number;
    imageUrl?: string;
}

const CreateQuiz = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<LocalQuestion[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [publishing, setPublishing] = useState(false);

    const [qType, setQType] = useState<QuestionType>("multiple_choice");
    const [qText, setQText] = useState("");
    const [qOptions, setQOptions] = useState<LocalOption[]>([
        { id: "a", text: "", label: "A" },
        { id: "b", text: "", label: "B" },
        { id: "c", text: "", label: "C" },
        { id: "d", text: "", label: "D" },
    ]);
    const [qCorrect, setQCorrect] = useState("");
    const [qTime, setQTime] = useState(20);
    const [qPoints, setQPoints] = useState(1000);
    const [qImageUrl, setQImageUrl] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!user) { router.push("/login"); }
    }, [user, router]);

    const resetForm = () => {
        setQType("multiple_choice");
        setQText("");
        setQOptions([
            { id: "a", text: "", label: "A" },
            { id: "b", text: "", label: "B" },
            { id: "c", text: "", label: "C" },
            { id: "d", text: "", label: "D" },
        ]);
        setQCorrect("");
        setQTime(20);
        setQPoints(1000);
        setQImageUrl("");
        setEditingIdx(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const supabase = createClient();
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toastError("File harus berupa gambar!"); return; }
        if (file.size > 5 * 1024 * 1024) { toastError("Ukuran file maksimal 5MB!"); return; }

        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage.from("question-images").upload(path, file);
        if (error) { toastError("Gagal mengupload gambar!"); setUploading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(path);
        setQImageUrl(publicUrl);
        setUploading(false);
        toastSuccess("Gambar berhasil diupload!");
    };

    const addQuestion = () => {
        if (!qText.trim()) { toastError("Tulis pertanyaan!"); return; }
        if (qType === "multiple_choice") {
            if (qOptions.some((o) => !o.text.trim())) { toastError("Isi semua opsi!"); return; }
            if (!qCorrect) { toastError("Pilih jawaban yang benar!"); return; }
        } else {
            if (!qCorrect.trim()) { toastError("Tulis jawaban yang benar!"); return; }
        }

        const question: LocalQuestion = {
            id: editingIdx !== null ? questions[editingIdx].id : crypto.randomUUID(),
            type: qType,
            text: qText,
            options: qType === "multiple_choice" ? qOptions : [],
            correctAnswer: qCorrect,
            timeLimit: qTime,
            points: qPoints,
            imageUrl: qImageUrl || undefined,
        };

        if (editingIdx !== null) {
            const updated = [...questions];
            updated[editingIdx] = question;
            setQuestions(updated);
            toastSuccess("Soal diperbarui!");
        } else {
            setQuestions([...questions, question]);
            toastSuccess("Soal ditambahkan!");
        }
        resetForm();
    };

    const editQuestion = (idx: number) => {
        const q = questions[idx];
        setQType(q.type);
        setQText(q.text);
        setQOptions(q.type === "multiple_choice" ? q.options : [
            { id: "a", text: "", label: "A" },
            { id: "b", text: "", label: "B" },
            { id: "c", text: "", label: "C" },
            { id: "d", text: "", label: "D" },
        ]);
        setQCorrect(q.correctAnswer);
        setQTime(q.timeLimit);
        setQPoints(q.points);
        setQImageUrl(q.imageUrl || "");
        setEditingIdx(idx);
    };

    const deleteQuestion = (idx: number) => {
        setQuestions(questions.filter((_, i) => i !== idx));
        if (editingIdx === idx) resetForm();
    };

    const handlePublish = async () => {
        if (!user) { toastError("Silakan login!"); return; }
        if (!title.trim()) { toastError("Beri judul quiz!"); return; }
        if (questions.length === 0) { toastError("Tambahkan minimal 1 soal!"); return; }
        const supabase = createClient();

        setPublishing(true);
        try {
            const roomCode = Array.from({ length: 6 }, () =>
                "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
            ).join("");

            const { data: quiz, error: quizError } = await supabase
                .from("quizzes")
                .insert({ id_user: user.id, title: title.trim(), description: description.trim(), room_code: roomCode })
                .select()
                .single();

            if (quizError || !quiz) { toastError("Gagal membuat quiz!"); return; }

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const { data: dbQuestion, error: qError } = await supabase
                    .from("questions")
                    .insert({
                        quiz_id: quiz.id,
                        type: q.type,
                        text: q.text,
                        correct_answer: q.correctAnswer,
                        time_limit: q.timeLimit,
                        points: q.points,
                        sort_order: i,
                        image_url: q.imageUrl || null,
                    })
                    .select()
                    .single();

                if (qError || !dbQuestion) continue;

                if (q.type === "multiple_choice" && q.options.length > 0) {
                    const optionsToInsert = q.options.map((opt, j) => ({
                        question_id: dbQuestion.id,
                        label: opt.label,
                        text: opt.text,
                        sort_order: j,
                    }));

                    await supabase.from("question_options").insert(optionsToInsert);

                    if (q.correctAnswer) {
                        const correctIdx = q.options.findIndex((o) => o.id === q.correctAnswer);
                        if (correctIdx >= 0) {
                            const { data: opts } = await supabase
                                .from("question_options")
                                .select("id")
                                .eq("question_id", dbQuestion.id)
                                .order("sort_order");
                            if (opts && opts[correctIdx]) {
                                await supabase
                                    .from("questions")
                                    .update({ correct_answer: opts[correctIdx].id })
                                    .eq("id", dbQuestion.id);
                            }
                        }
                    }
                }
            }

            const { error: sessionError } = await supabase
                .from("quiz_sessions")
                .insert({ quiz_id: quiz.id, host_id: user.id, room_code: roomCode, status: "waiting" });

            if (sessionError) { toastError("Gagal membuat sesi!"); return; }

            toastSuccess("Quiz berhasil dibuat!");
            router.push(`/lobby/${roomCode}`);
        } catch (err) {
            toastError("Terjadi kesalahan!");
        } finally {
            setPublishing(false);
        }
    };

    const optionColors = [
        "bg-primary/10 border border-primary",
        "bg-green-500/10 border border-green-500",
        "bg-purple-500/10 border border-purple-500",
        "bg-red-500/10 border border-red-500",
    ];

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden">
            <header className="flex items-center gap-4 p-6 border-b border-border">
                <Button variant="ghost" className="cursor-pointer" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-poppins font-bold text-foreground">Buat Quiz</span>
                </div>
                <div className="ml-auto">
                    <Button
                        variant="primary"
                        onClick={handlePublish}
                        disabled={publishing}
                    >
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Publish <Globe className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Question Form */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="glass rounded-2xl p-6 space-y-4">
                        <Input
                            placeholder="Judul Quiz"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg lg:text-xl bg-primary/5 h-12"
                            maxLength={100}
                        />
                        <Textarea
                            placeholder="Deskripsi (opsional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-primary/5 resize-none"
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    <div className="glass rounded-2xl p-6 space-y-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 items-start justify-between">
                            <h2 className="font-poppins font-semibold text-foreground">
                                {editingIdx !== null ? `Edit Soal #${editingIdx + 1}` : "Tambah Soal"}
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={qType === "multiple_choice" ? "default" : "outline"}
                                    className={qType === "multiple_choice" ? "bg-gradient-primary text-primary-foreground" : "border-border bg-primary/5"}
                                    onClick={() => setQType("multiple_choice")}
                                >
                                    <ListChecks className="w-4 h-4 mr-1" /> Pilihan Ganda
                                </Button>
                                <Button
                                    size="sm"
                                    variant={qType === "short_answer" ? "default" : "outline"}
                                    className={qType === "short_answer" ? "bg-gradient-primary text-primary-foreground" : "border-border bg-primary/5"}
                                    onClick={() => setQType("short_answer")}
                                >
                                    <Type className="w-4 h-4 mr-1" /> Isian Singkat
                                </Button>
                            </div>
                        </div>

                        <Textarea
                            placeholder="Tulis pertanyaan..."
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            className="bg-primary/5 resize-none h-20 overflow-y-auto lg:text-lg"
                            rows={3}
                            maxLength={500}
                        />

                        {/* Image upload */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground block">Gambar Soal (opsional)</label>
                            {qImageUrl ? (
                                <div className="relative inline-block">
                                    <Image src={qImageUrl} alt="Preview" className="max-h-40 rounded-xl border border-border" />
                                    <button
                                        onClick={() => setQImageUrl("")}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border cursor-pointer bg-primary/5 hover:bg-primary/20 transition-colors">
                                    {uploading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <ImagePlus className="w-5 h-5 text-muted-foreground" />
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                        {uploading ? "Mengupload..." : "Klik untuk upload gambar (maks 5MB)"}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>

                        {qType === "multiple_choice" ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {qOptions.map((opt, i) => (
                                    <div
                                        key={opt.id}
                                        className={`relative rounded-xl p-3 cursor-pointer transition-all ${qCorrect === opt.id
                                                ? "ring-2 ring-primary shadow-glow"
                                                : "hover:ring-1 hover:ring-border"
                                            }`}
                                        onClick={() => setQCorrect(opt.id)}
                                    >
                                        <div className={`absolute inset-0 rounded-xl ${optionColors[i]}`} />
                                        <div className="relative flex items-center gap-2">
                                            <div className={`w-12 lg:w-10 shadow h-8 rounded-full flex items-center justify-center text-xs font-bold ${qCorrect === opt.id ? "bg-green-500 text-primary-foreground" : "bg-primary/20 text-muted-foreground"
                                                }`}>
                                                {qCorrect === opt.id ? <Check className="w-3 h-3" /> : opt.label}
                                            </div>
                                            <Input
                                                placeholder={`Opsi ${opt.label}`}
                                                value={opt.text}
                                                onChange={(e) => {
                                                    const updated = [...qOptions];
                                                    updated[i] = { ...opt, text: e.target.value };
                                                    setQOptions(updated);
                                                }}
                                                className="bg-transparent border-none focus-visible:ring-0 text-foreground"
                                                onClick={(e) => e.stopPropagation()}
                                                maxLength={200}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Input
                                placeholder="Jawaban yang benar"
                                value={qCorrect}
                                onChange={(e) => setQCorrect(e.target.value)}
                                className="bg-primary/5"
                                maxLength={200}
                            />
                        )}

                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <label className="text-sm text-muted-foreground mb-1 block">Waktu (detik)</label>
                                <Input
                                    type="number"
                                    value={qTime}
                                    onChange={(e) => setQTime(Number(e.target.value))}
                                    min={5}
                                    max={120}
                                    className="bg-primary/5"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm text-muted-foreground mb-1 block">Poin</label>
                                <Input
                                    type="number"
                                    value={qPoints}
                                    onChange={(e) => setQPoints(Number(e.target.value))}
                                    min={100}
                                    max={5000}
                                    step={100}
                                    className="bg-primary/5"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {editingIdx !== null && (
                                <Button variant="outline" className="border-border" onClick={resetForm}>Batal</Button>
                            )}
                            <Button variant='primary' className="w-full" onClick={addQuestion}>
                                <Plus className="w-4 h-4 mr-2" />
                                {editingIdx !== null ? "Simpan Perubahan" : "Tambah Soal"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Question List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-poppins font-semibold text-foreground">
                        Daftar Soal ({questions.length})
                    </h3>
                    <AnimatePresence>
                        {questions.length === 0 ? (
                            <div className="glass rounded-xl shadow p-8 text-center text-muted-foreground">
                                <p className="text-sm">Belum ada soal. Tambahkan soal pertamamu!</p>
                            </div>
                        ) : (
                            questions.map((q, i) => (
                                <motion.div
                                    key={q.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="glass rounded-xl p-4 space-y-2 shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                                {q.type === "multiple_choice" ? "Pilihan Ganda" : "Isian Singkat"}
                                            </span>
                                            {q.imageUrl && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                    🖼️
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-500 hover:bg-yellow-500/50 bg-yellow-500/10 border border-yellow-500 cursor-pointer" onClick={() => editQuestion(i)}>
                                                <Type className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/50 bg-destructive/10 border border-destructive cursor-pointer" onClick={() => deleteQuestion(i)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground line-clamp-2">{q.text}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>{q.timeLimit}s</span>
                                        <span>•</span>
                                        <span>{q.points} pts</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CreateQuiz;
