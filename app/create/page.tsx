/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Check, Zap, ListChecks, Type, Loader2, ImagePlus, X, Sparkles, Globe, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/hooks/useQuiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import Image from "next/image";

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
    const [isPublic, setIsPublic] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState("medium");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
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

    function extractJSON(text: string) {
        return text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
    }

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

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) { toastError("Masukkan topik quiz!"); return; }
        setAiGenerating(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ topik: aiTopic.trim(), jumlah: aiNumQuestions, level: aiDifficulty }),
            });

            if (res.status !== 200) throw new Error("Gagal generate quiz!");
            const response = await res.json();
            const data = JSON.parse(extractJSON(response.res));
            console.log(data);
            if (!title.trim() && data.title) setTitle(data.title);
            if (!description.trim() && data.description) setDescription(data.description);
            const newQuestions: LocalQuestion[] = (data.questions || []).map((q: any) => {
                const options: LocalOption[] = (q.options || []).map((o: any, i: number) => ({
                    id: o.label.toLowerCase(),
                    text: o.text,
                    label: o.label,
                }));
                return {
                    id: crypto.randomUUID(),
                    type: q.type as QuestionType,
                    text: q.text,
                    options,
                    correctAnswer: q.type === "multiple_choice" ? (q.correct_answer_label || "a").toLowerCase() : q.correct_answer_label,
                    timeLimit: q.time_limit || 20,
                    points: q.points || 1000,
                };
            });

            setQuestions(prev => [...prev, ...newQuestions]);
            toastSuccess(`${newQuestions.length} Soal berhasil di-generate!`);
            setShowAiPanel(false);
        } catch (err: any) {
            console.error(err);
            toastError(err?.message || "Gagal generate quiz!");
        } finally {
            setAiGenerating(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toastError("File harus berupa gambar!"); return; }
        if (file.size > 5 * 1024 * 1024) { toastError("Ukuran file maksimal 5MB!"); return; }

        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;

        const supabase = createClient();
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

        setPublishing(true);
        try {
            const roomCode = Array.from({ length: 6 }, () =>
                "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
            ).join("");
            const supabase = createClient();
            const { data: quiz, error: quizError } = await supabase
                .from("quizzes")
                .insert({ id_user: user.id, title: title.trim(), description: description.trim(), room_code: roomCode, is_public: isPublic })
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
        "bg-primary/15 border-primary",
        "bg-green-500/15 border-green-500",
        "bg-yellow-500/15 border-yellow-500",
        "bg-destructive/15 border-destructive",
    ];

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden">
            <header className="flex items-center gap-4 p-6 border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-poppins font-bold text-foreground">Buat Quiz</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <Button
                        onClick={() => setIsPublic(!isPublic)}
                        className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${isPublic ? "bg-accent/20 text-accent hover:bg-accent/40" : "bg-red-500/20 text-red-500 hover:bg-red-500/40"
                            }`}
                    >
                        {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {isPublic ? "Publik" : "Privat"}
                    </Button>
                    <Button
                        variant="primaryOutliner"
                        className="border-primary border"
                        onClick={() => setShowAiPanel(!showAiPanel)}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Generate
                    </Button>
                    <Button
                        className="bg-gradient-primary text-primary-foreground"
                        onClick={handlePublish}
                        disabled={publishing}
                    >
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Publish Quiz
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
                            className="text-xl font-poppins bg-primary/5 h-12"
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

                    {/* AI Generate Panel */}
                    <AnimatePresence>
                        {showAiPanel && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="glass rounded-2xl p-6 space-y-4 border border-accent/20">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-accent" />
                                        <h3 className="font-poppins font-bold text-foreground">AI Quiz Generator</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Masukkan topik dan AI akan otomatis generate soal-soal quiz untukmu!
                                    </p>
                                    <Input
                                        placeholder="Topik quiz (misal: Sejarah Indonesia, Matematika SMA, Biologi Sel...)"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        className="bg-primary/5 h-12"
                                        maxLength={200}
                                    />
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <label className="text-sm text-muted-foreground mb-1 block">Jumlah Soal</label>
                                            <Input
                                                type="number"
                                                value={aiNumQuestions}
                                                onChange={(e) => setAiNumQuestions(Math.min(20, Math.max(1, Number(e.target.value))))}
                                                min={1}
                                                max={20}
                                                className="bg-primary/5"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-sm text-muted-foreground mb-1 block">Kesulitan</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: "easy", label: "Mudah" },
                                                    { id: "medium", label: "Sedang" },
                                                    { id: "hard", label: "Sulit" },
                                                ].map((d) => (
                                                    <Button
                                                        key={d.id}
                                                        onClick={() => setAiDifficulty(d.id)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${d.id == 'easy' ? 'hover:bg-green-700' : d.id == 'medium' ? 'hover:bg-yellow-700' : 'hover:bg-red-700'} ${aiDifficulty === d.id
                                                            ? `${d.id == 'easy' ? 'bg-green-500' : d.id == 'medium' ? 'bg-yellow-500' : 'bg-red-500'} text-primary-foreground`
                                                            : "bg-secondary text-muted-foreground"
                                                            }`}
                                                    >
                                                        {d.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full bg-gradient-accent text-accent-foreground"
                                        onClick={handleAiGenerate}
                                        disabled={aiGenerating}
                                    >
                                        {aiGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate {aiNumQuestions} Soal
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="glass rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-poppins font-semibold text-foreground">
                                {editingIdx !== null ? `Edit Soal #${editingIdx + 1}` : "Tambah Soal"}
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={qType === "multiple_choice" ? "default" : "outline"}
                                    className={qType === "multiple_choice" ? "bg-gradient-primary text-primary-foreground" : "bg-primary/10 border-border"}
                                    onClick={() => setQType("multiple_choice")}
                                >
                                    <ListChecks className="w-4 h-4 mr-1" /> Pilihan Ganda
                                </Button>
                                <Button
                                    size="sm"
                                    variant={qType === "short_answer" ? "default" : "outline"}
                                    className={qType === "short_answer" ? "bg-gradient-primary text-primary-foreground" : "bg-primary/10 border-border"}
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
                            className="bg-primary/5 text-lg"
                            rows={3}
                            maxLength={500}
                        />

                        {/* Image upload */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground block">Gambar Soal (opsional)</label>
                            {qImageUrl ? (
                                <div className="relative inline-block">
                                    <Image width={80} height={80} src={qImageUrl} alt="Preview" className="max-h-40 rounded-xl border border-border" />
                                    <button
                                        onClick={() => setQImageUrl("")}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border cursor-pointer hover:bg-secondary/50 transition-colors">
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
                            <div className="grid grid-cols-2 gap-3">
                                {qOptions.map((opt, i) => (
                                    <div
                                        key={opt.id}
                                        className={`relative rounded-xl p-3 cursor-pointer transition-all ${qCorrect === opt.id
                                            ? "ring-2 ring-primary shadow-glow"
                                            : "hover:ring-1 hover:ring-border"
                                            }`}
                                        onClick={() => setQCorrect(opt.id)}
                                    >
                                        <div className={`absolute inset-0 rounded-xl border ${optionColors[i]}`} />
                                        <div className="relative flex items-center gap-2">
                                            <div className={`w-10 h-8 shadow-[1px_1px_2px_rgba(0,0,0,0.3)] rounded-full flex items-center justify-center text-xs font-bold ${qCorrect === opt.id ? "bg-green-500 text-primary-foreground" : "bg-card text-muted-foreground"
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
                            <Button className="flex-1 bg-gradient-primary text-primary-foreground py-5" onClick={addQuestion}>
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
                            <div className="glass rounded-xl p-8 text-center shadow text-muted-foreground">
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
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editQuestion(i)}>
                                                <Type className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteQuestion(i)}>
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
