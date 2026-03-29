/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Check, Zap, ListChecks, Type, Loader2, ImagePlus, X, Sparkles, Globe, Lock, Minus, Snowflake, Shield, Star, Upload, Text, File } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/hooks/useQuiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import Image from "next/image";
import { FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

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
    const { user, profile, updateLog } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<LocalQuestion[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState("easy");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [showManualPanel, setShowManualPanel] = useState(true);
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
    const [fileUrl, setFileUrl] = useState<{ size: number, url: string, name: string, type: string }[]>([]);
    const [file, setFile] = useState<File[]>([]);
    const [isDrag, setIsDrag] = useState<boolean>(false);
    const [selected, setSelected] = useState({
        doublePoints: true,
        fiftyFifty: true,
        lightning: true,
        freeze: true
    });
    const supaRef = useRef(createClient());
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) { router.push("/login"); }
    }, [user, router]);

    const manageFile = async (file: File) => {
        if (file.size > (5 * 1024 * 1024)) { toastError("Ukuran file maksimal 5MB!"); return; }
        const allowedType = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'];
        if (!allowedType.includes(file.type)) { toastError("Tipe file tidak diizinkan!"); return; }
        const type = file.type.startsWith('application/pdf') ? 'PDF' : file.type.startsWith('image/') ? 'IMG' : 'CSV';
        const url = URL.createObjectURL(file);
        if (type == 'CSV') {
            const fileText = await file.text();
            const total = fileText
                .trim()
                .split("\n")
                .slice(1)
                .length;
            setAiNumQuestions(Math.min(20, total));
        }
        setAiTopic(`Buatkan soalnya dari referensi file ${type} ini`);
        setFile((prev) => [...prev, file]);
        setFileUrl((prev) => [...prev, { size: file.size, url, name: file.name, type }]);
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsDrag(false);
        const file = e.target.files?.[0];
        if (!file) { toastError("File tidak ditemukan!"); return; }
        await manageFile(file);
    }

    const handleFileDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) { toastError("File tidak ditemukan"); return; }
        await manageFile(file);
    }

    const convertSize = (bytes: number) => {
        if (bytes < 1024) {
            return bytes + ' bytes';
        } else if (bytes < 1048576) {
            return (bytes / 1024).toFixed(1) + ' KB';
        } else {
            return (bytes / 1048576).toFixed(1) + ' MB';
        }
    }

    const extractJSON = (text: string) => {
        return text.replace(/```json/g, "").replace(/```/g, "").trim();
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

    const resetFormAI = () => {
        setAiTopic("");
        setAiNumQuestions(5);
        setAiDifficulty("easy");
        setFile([]);
        setFileUrl([]);
    }

    const handlePanel = (panel: string) => {
        setShowAiPanel(false);
        setShowManualPanel(false);

        if (panel === "ai") setShowAiPanel(true);
        else if (panel === "manual") setShowManualPanel(true);
    }

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) { toastError("Masukkan topik quiz!"); return; }
        if (aiNumQuestions <= 0) { toastError("Jumlah soal minimal 1!"); return; }
        setAiGenerating(true);

        try {

            // FORMDATA
            const formData = new FormData();
            formData.append('topik', aiTopic.trim());
            formData.append('jumlah', aiNumQuestions.toString());
            formData.append('level', aiDifficulty);
            file.forEach((f: File) => {
                formData.append('files', f);
            })

            const res = await fetch(`/api/generate`, {
                method: "POST",
                body: formData
            });

            if (res.status !== 200) { toastError("RafAI tidak merespon!"); return; }
            const response = await res.json();
            const data = JSON.parse(extractJSON(response.res));
            if (!title.trim() && data.title) setTitle(data.title);
            if (!description.trim() && data.description) setDescription(data.description);
            await updateLog({ type: "quiz", action: "AI berhasil generate", user: profile?.nama_lengkap ?? "uknown", severity: "info" })

            const newQuestions: LocalQuestion[] = (data.questions || []).map((q: any) => {
                const options: LocalOption[] = (q.options || []).map((op: any, i: number) => ({
                    id: i === 0 ? "a" : i === 1 ? "b" : i === 2 ? "c" : "d",
                    text: op.text,
                    label: op.label,
                }));
                return {
                    id: crypto.randomUUID(),
                    type: q.type as QuestionType,
                    text: q.text,
                    options,
                    correctAnswer: q.type === "multiple_choice" ? q.correct_answer_label.toLowerCase() : q.correct_answer_label,
                    timeLimit: q.time_limit || 20,
                    points: q.points || 1000,
                };
            });

            setQuestions(prev => [...prev, ...newQuestions]);
            toastSuccess(`${newQuestions.length} Soal berhasil di-generate!`);
            setShowAiPanel(false);
            setShowManualPanel(true);
            resetFormAI();
        } catch (err) {
            console.log(err);
            await updateLog({ type: "quiz", action: "AI gagal generate", user: profile?.nama_lengkap ?? "uknown", severity: "danger" })
            toastError("Gagal generate quiz, silahkan coba lagi!");
        } finally {
            setAiGenerating(false);
        }
    };

    const handleDeleteImage = async (imageUrl: string) => {
        setUploading(true)
        const res = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
            method: 'DELETE'
        });

        if (res.status !== 200) {
            toastError("Gagal menghapus gambar!");
            return;
        }
        toastSuccess("Gambar berhasil dihapus!");
        setQImageUrl("");
        setUploading(false);
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { toastError("File tidak ditemukan!"); return; }
        if (!file.type.startsWith("image/")) { toastError("File harus berupa gambar!"); return; }
        if (file.size > 5 * 1024 * 1024) { toastError("Ukuran file maksimal 5MB!"); return; }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`/api/upload`, {
                method: "POST",
                body: formData
            });

            if (res.status !== 200) {
                toastError("Gagal mengupload gambar!");
                return;
            }
            await updateLog({ type: "quiz", action: "Upload gambar berhasil", user: profile?.nama_lengkap ?? "uknown", severity: "info" })
            const data = await res.json();
            const publicUrl = data.url;
            setQImageUrl(publicUrl);
            toastSuccess("Gambar berhasil diupload!");
        } catch {
            await updateLog({ type: "quiz", action: "Gagal upload gambar", user: profile?.nama_lengkap ?? "uknown", severity: "danger" })
            toastError("Gagal mengupload gambar!");
        } finally {
            setUploading(false);
        }
    };

    const addQuestion = () => {
        if (!qText.trim()) { toastError("Tulis pertanyaan!"); return; }
        if (qType === "multiple_choice") {
            if (qOptions.some((op) => !op.text.trim())) { toastError("Isi semua opsi!"); return; }
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
            const supabase = supaRef.current;
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

            const powerUpsJson = JSON.stringify(selected);
            const { error: sessionError } = await supabase
                .from("quiz_sessions")
                .insert({ quiz_id: quiz.id, host_id: user.id, room_code: roomCode, status: "waiting", allowed_skill: powerUpsJson });

            if (sessionError) { toastError("Gagal membuat sesi!"); return; }

            toastSuccess("Quiz berhasil dibuat!");
            router.push(`/lobby/${roomCode}`);
        } catch {
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
            <header className="flex bg-primary/5 items-center gap-4 px-6 py-4 border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-poppins font-bold text-foreground">Buat Quiz</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <Button
                        onClick={() => setIsPublic(!isPublic)}
                        className={`flex-1 flex items-center gap-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${isPublic ? "bg-accent/20 text-accent border-accent hover:bg-accent/40" : "bg-red-500/20 text-red-500 border-red-500 hover:bg-red-500/40"
                            }`}
                    >
                        {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span className="hidden lg:inline-block">{isPublic ? "Publik" : "Privat"}</span>
                    </Button>
                    <Button
                        variant={'primary'}
                        onClick={handlePublish}
                        disabled={publishing}
                    >
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5" />}
                        <span className="hidden lg:inline-block">Publish</span>
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
                            className="text-lg font-poppins bg-primary/5 h-14"
                            maxLength={100}
                        />
                        <Textarea
                            placeholder="Deskripsi (opsional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-primary/5 resize-none h-18"
                            rows={2}
                            maxLength={500}
                        />
                    </div>


                    <div className="space-y-3 glass rounded-xl p-6">
                        <section className="flex items-center justify-between">
                            <h1 className="font-semibold font-poppins">Power Ups</h1>
                            <p>Dipilih: {Object.entries(selected).map(([key, value]) => value ? key : null).filter(Boolean).length}</p>
                        </section>
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
                    </div>

                    <div className="flex items-center flex-wrap glass gap-2 rounded-xl p-6">
                        <Button
                            variant="primaryOutliner"
                            className={`flex-1 shrink border border-primary ${showManualPanel && "bg-primary/50"}`}
                            onClick={() => handlePanel("manual")}
                        >
                            <Text className="w-4 h-4" />
                            Manual
                        </Button>
                        <Button
                            variant="primaryOutliner"
                            className={`flex-1 shrink border border-primary ${showAiPanel && "bg-primary/50"}`}
                            onClick={() => handlePanel("ai")}
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Generate
                        </Button>
                    </div>

                    {/* MANUAL GENERATE */}
                    <AnimatePresence mode="wait">
                        {showManualPanel &&
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="glass rounded-2xl p-6 space-y-5">
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                    <h2 className="font-poppins flex items-center gap-2 font-semibold text-foreground">
                                        <Text className="w-5 h-5 text-primary" />
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
                                    className="bg-primary/5 resize-none h-18"
                                    rows={3}
                                    maxLength={500}
                                />

                                {/* Image upload */}
                                <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground block">Gambar Soal (opsional)</label>
                                    {qImageUrl ? (
                                        <div className="relative inline-block">
                                            <Image width={100} height={100} src={qImageUrl} alt="Preview" className="max-h-40 aspect-auto rounded-xl border border-primary/30" />
                                            <Button
                                                type="button"
                                                variant={'ghost'}
                                                size={'icon'}
                                                onClick={() => handleDeleteImage(qImageUrl)}
                                                disabled={uploading}
                                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                                            >
                                                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                            </Button>
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
                                                className={`relative col-span-2 lg:col-span-1 rounded-xl p-3 cursor-pointer transition-all ${qCorrect === opt.id
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
                                    <Button className="flex-1 bg-gradient-primary cursor-pointer text-primary-foreground py-5" onSubmit={addQuestion} onClick={addQuestion}>
                                        <Plus className="w-4 h-4 mr-1" />
                                        {editingIdx !== null ? "Simpan Perubahan" : "Tambah Soal"}
                                    </Button>
                                </div>
                            </motion.div>
                        }
                    </AnimatePresence>

                    {/* AI Generate Panel */}
                    <AnimatePresence mode="wait">
                        {showAiPanel && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="glass rounded-2xl p-6 space-y-4 border border-accent/20">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        <h3 className="font-poppins font-bold text-foreground">AI Quiz Generator</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Referensi soal (optional)</p>
                                    <label
                                        onDragEnter={() => setIsDrag(true)}
                                        onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                                        onDragLeave={() => setIsDrag(false)}
                                        onDrop={handleFileDrop}
                                        className={`flex flex-col items-center justify-center w-full h-38 overflow-y-auto overflow-x-hidden border-2 border-primary/50 border-dashed rounded-lg cursor-pointer ${isDrag ? 'bg-primary/30' : 'bg-primary/10'}  hover:bg-primary/30 transition font-poppins`}>
                                        <div className="flex items-center justify-center pt-5 pb-6 flex-wrap gap-2">
                                            {fileUrl.length > 0 ?
                                                fileUrl.map(({ size, url, type }: { size: number, url: string, name: string, type: string }) => (
                                                    <div className={`w-22 h-24 relative flex flex-col shadow items-center justify-center gap-1 rounded-xl ${type == 'PDF' ? 'bg-destructive/10 border-destructive/30' : type == 'IMG' ? 'bg-sky-500/10 border-sky-500/30' : type == 'CSV' ? 'bg-green-500/10 border-green-500/30' : 'bg-primary/10 border-primary/30'} border`} key={url}>
                                                        <X className="w-5 h-5 absolute -top-1 -right-1 text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); setFileUrl((prev) => prev.filter(p => p.url != url)) }} />
                                                        <Link href={url} target="_blank" className={`${type == 'PDF' ? 'text-destructive' : type == 'IMG' ? 'text-sky-500' : type == 'CSV' ? 'text-green-500' : 'text-primary'} text-md font-semibold underline`}>{type}</Link>
                                                        <p className="text-muted-foreground text-xs">{convertSize(size)}</p>
                                                    </div>
                                                ))
                                                :
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    <svg className="w-8 h-8 mb-4 text-muted-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                                    </svg>
                                                    <p className="mb-2 text-sm text-muted-foreground dark:text-gray-400"><span className="font-semibold text-foreground">Click to upload</span> or <span className="font-semibold text-foreground">drag and drop</span></p>
                                                    <p className="text-xs text-muted-foreground ">(PDF, JPEG, PNG, CSV) - (MAX. 5MB)</p>
                                                </div>
                                            }
                                        </div>
                                        <input
                                            ref={fileRef}
                                            onChange={handleFileUpload}
                                            type="file" className="hidden" multiple hidden required />
                                    </label>
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
                                    <div className="flex flex-col gap-4 items-center">
                                        <div className="flex-1 flex flex-col items-center gap-2">
                                            <label className="text-md text-muted-foreground">Jumlah Soal</label>
                                            <div className="flex items-center justify-center gap-2">
                                                <Button size={'icon'} variant={'destructive'} className="cursor-pointer" onClick={() => setAiNumQuestions(Math.max(1, aiNumQuestions - 1))}>
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <Input
                                                    type="text"
                                                    value={aiNumQuestions}
                                                    disabled
                                                    onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                                                    min={1}
                                                    max={20}
                                                    className="bg-primary/5 w-12 h-12 text-center"
                                                />
                                                <Button size={'icon'} variant={'primary'} onClick={() => setAiNumQuestions(Math.min(20, aiNumQuestions + 1))}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center gap-2">
                                            <label className="text-md text-muted-foreground">Kesulitan</label>
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
                                        variant={'primary'}
                                        className="w-full py-5"
                                        onSubmit={handleAiGenerate}
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
                                                <Sparkles className="w-4 h-4 mr-1" />
                                                Generate {aiNumQuestions} Soal
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-yellow-500/10 border border-yellow-500 text-yellow-500 hover:bg-yellow-500/30 hover:text-yellow-600 cursor-pointer" onClick={() => editQuestion(i)}>
                                                <Type className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/30 hover:text-destructive cursor-pointer" onClick={() => deleteQuestion(i)}>
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
