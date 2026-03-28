"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
    {
        id: 1,
        icon: "📋",
        title: "Pendahuluan",
        content: (
            <p>
                Dengan menggunakan aplikasi <strong className="text-white font-medium">QuizArena</strong>,
                Anda menyetujui untuk terikat oleh seluruh syarat dan ketentuan yang berlaku. Jika Anda
                tidak menyetujui, harap tidak menggunakan layanan ini.
            </p>
        ),
    },
    {
        id: 2,
        icon: "📖",
        title: "Definisi",
        content: (
            <ul className="space-y-2 mt-2">
                {[
                    ["Aplikasi", "Platform QuizArena"],
                    ["Pengguna", "Individu yang mendaftar dan menggunakan layanan"],
                    ["Konten", "Soal, jawaban, skor, dan data terkait lainnya"],
                ].map(([term, def]) => (
                    <li key={term} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                        <span>
                            <span className="text-blue-400 font-medium">{term}</span>{" — "}{def}
                        </span>
                    </li>
                ))}
            </ul>
        ),
    },
    {
        id: 3,
        icon: "✅",
        title: "Penggunaan Layanan",
        content: (
            <>
                <p>Pengguna setuju untuk:</p>
                <ul className="space-y-2 mt-2">
                    {[
                        "Menggunakan aplikasi secara wajar dan tidak melanggar hukum",
                        "Tidak melakukan manipulasi sistem (cheating, exploit, bot)",
                        "Tidak mengganggu pengguna lain",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 4,
        icon: "👤",
        title: "Akun Pengguna",
        content: (
            <ul className="space-y-2 mt-2">
                {[
                    "Pengguna bertanggung jawab atas keamanan akun",
                    "Dilarang membagikan akun kepada pihak lain",
                    "Segala aktivitas dalam akun menjadi tanggung jawab pengguna",
                ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        ),
    },
    {
        id: 5,
        icon: "🏆",
        title: "Sistem Quiz & Penilaian",
        content: (
            <ul className="space-y-2 mt-2">
                {[
                    "Skor ditentukan berdasarkan jawaban dan waktu",
                    "Sistem berhak menentukan hasil akhir (leaderboard)",
                    "Keputusan sistem bersifat final",
                ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        ),
    },
    {
        id: 6,
        icon: "🚫",
        title: "Larangan",
        content: (
            <>
                <p>Pengguna dilarang:</p>
                <ul className="space-y-2 mt-2">
                    {[
                        "Melakukan kecurangan dalam quiz",
                        "Menggunakan script/bot otomatis",
                        "Mengeksploitasi bug sistem",
                        "Mengunggah konten berbahaya atau ilegal",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 7,
        icon: "⚖️",
        title: "Sanksi",
        content: (
            <>
                <p>Kami berhak:</p>
                <ul className="space-y-2 mt-2">
                    {["Menangguhkan akun", "Menghapus akun", "Menghapus data pengguna"].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-slate-500 text-sm">
                    Tanpa pemberitahuan sebelumnya jika terjadi pelanggaran.
                </p>
            </>
        ),
    },
    {
        id: 8,
        icon: "💡",
        title: "Hak Kekayaan Intelektual",
        content: (
            <p>
                Seluruh konten dalam aplikasi merupakan milik{" "}
                <strong className="text-white font-medium">QuizArena</strong> kecuali dinyatakan lain.
            </p>
        ),
    },
    {
        id: 9,
        icon: "🌐",
        title: "Ketersediaan Layanan",
        content: <p>Kami tidak menjamin layanan selalu bebas gangguan atau error.</p>,
    },
    {
        id: 10,
        icon: "🔄",
        title: "Perubahan Layanan",
        content: <p>Kami dapat mengubah fitur, sistem, atau kebijakan kapan saja.</p>,
    },
    {
        id: 11,
        icon: "🛡️",
        title: "Pembatasan Tanggung Jawab",
        content: (
            <>
                <p>Kami tidak bertanggung jawab atas:</p>
                <ul className="space-y-2 mt-2">
                    {["Kehilangan data", "Gangguan layanan", "Kerugian akibat penggunaan aplikasi"].map(
                        (item) => (
                            <li key={item} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1 text-xs shrink-0">▸</span>
                                <span>{item}</span>
                            </li>
                        )
                    )}
                </ul>
            </>
        ),
    },
    {
        id: 12,
        icon: "🔚",
        title: "Pengakhiran",
        content: (
            <p>
                Pengguna dapat berhenti menggunakan layanan kapan saja. Kami juga dapat menghentikan
                akses pengguna jika melanggar aturan.
            </p>
        ),
    },
    {
        id: 13,
        icon: "⚖️",
        title: "Hukum yang Berlaku",
        content: <p>Syarat ini tunduk pada hukum yang berlaku di Indonesia.</p>,
    },
];

export default function TermsPage() {
    const [activeSection, setActiveSection] = useState<number | null>(null);

    const toggle = (id: number) => setActiveSection((prev) => (prev === id ? null : id));
    const accordion = useMemo(() => {
        return sections.map((sec, i) => {
            const isOpen = activeSection === sec.id;
            return (
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, type: "spring", delay: (i + 5) / 10 }}

                    key={sec.id}
                    onClick={() => toggle(sec.id)}
                    className={`rounded-2xl border cursor-pointer transition-all duration-250 overflow-hidden bg-primary/10 ${isOpen
                        ? "border-primary shadow-[0_8px_32px_rgba(59,130,246,0.1)]"
                        : "border-primary/30 hover:border-blue-500/25 hover:shadow-[0_4px_24px_rgba(59,130,246,0.06)]"
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3.5 px-5 py-4 select-none">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[0.72rem] font-bold text-blue-400 shrink-0">
                            {String(sec.id).padStart(2, "0")}
                        </div>
                        <span className="text-lg shrink-0">{sec.icon}</span>
                        <span className="flex-1 font-bold text-[0.93rem] text-white">{sec.title}</span>
                        <span
                            className={`text-[0.6rem] shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-blue-400" : "text-slate-600"
                                }`}
                        >
                            ▼
                        </span>
                    </div>

                    <div
                        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                    >
                        <div className="overflow-hidden">
                            <div className="px-5 pb-5 pt-4 pl-17 text-sm leading-7 text-slate-400 border-t border-white/10">
                                {sec.content}
                            </div>
                        </div>
                    </div>
                </motion.div>
            );
        })
    }, [activeSection])

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary/10  blur-[120px]" />
                <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-primary/3 blur-[200px]" />
            </div>

            <main className="max-w-3xl mx-auto px-5 py-18">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center space-y-4 mb-14 pb-12 border-b border-blue-500/20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary text-sm text-primary"
                    >
                        📄 Legal Document
                    </motion.div>
                    <motion.h1
                        className="text-5xl sm:text-6xl font-poppins tracking-tighter font-extrabold flex flex-col"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                    >
                        <span className="text-foreground">Syarat & </span>
                        <span className="text-primary">Ketentuan</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-5 text-sm text-muted-foreground flex-wrap mt-5">
                        <span>⚡ QuizArena</span>
                        <Dot className="hidden lg:inline-block" />
                        <span>📅 Berlaku per 2025</span>
                        <Dot className="hidden lg:inline-block" />
                        <span>ID Hukum Indonesia</span>
                    </motion.div>
                </motion.div>

                {/* Accordion */}
                <div className="flex flex-col gap-2.5">
                    {accordion}
                </div>

                {/* Footer note */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="mt-10 p-5 bg-primary/10 border border-primary rounded-2xl text-center text-sm text-muted-foreground leading-7">
                    <p>Dengan menggunakan QuizArena, Anda menyetujui seluruh ketentuan di atas.</p>
                    <p>
                        Pertanyaan? Hubungi kami atau baca{" "}
                        <Link href="/privacy" className="text-primary hover:underline font-medium">
                            Kebijakan Privasi
                        </Link>{" "}
                        kami.
                    </p>

                </motion.div>

                {/* Bottom switcher */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="flex justify-center gap-3 mt-8 flex-wrap">
                    <Button variant={'primary'} className="px-6 py-5!" asChild>
                        <Link
                            href="/privacy"
                            className=""
                        >
                            🔐 Lihat Kebijakan Privasi
                        </Link>
                    </Button>
                    <Button variant={'ghost'} className="px-6 py-5 bg-background hover:bg-background/40 border" asChild>
                        <Link
                            href="/"
                            className=""
                        >
                            <ArrowLeft /> Kembali ke Beranda
                        </Link>
                    </Button>

                </motion.div>
            </main>
        </div>
    );
}