"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
    { icon: "🚫", title: "Tidak Dijual", desc: "Data Anda tidak pernah dijual ke pihak ketiga" },
    { icon: "🔒", title: "Aman & Terenkripsi", desc: "Disimpan dengan standar keamanan tinggi" },
    { icon: "✋", title: "Hak Anda", desc: "Akses, ubah, atau hapus data kapan saja" },
];

const sections = [
    {
        id: 1,
        icon: "📋",
        title: "Pendahuluan",
        content: (
            <p>
                Kebijakan ini menjelaskan bagaimana{" "}
                <strong className="text-white font-medium">QuizArena</strong> mengumpulkan, menggunakan,
                dan melindungi data pengguna. Privasi Anda adalah prioritas kami.
            </p>
        ),
    },
    {
        id: 2,
        icon: "📦",
        title: "Data yang Dikumpulkan",
        content: (
            <>
                <p>Kami dapat mengumpulkan:</p>
                <ul className="space-y-2 mt-2">
                    {[
                        "Nama pengguna",
                        "Email",
                        "Data permainan (skor, jawaban, statistik)",
                        "Informasi perangkat (browser, IP secara umum)",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 3,
        icon: "⚙️",
        title: "Cara Penggunaan Data",
        content: (
            <>
                <p>Data digunakan untuk:</p>
                <ul className="space-y-2 mt-2">
                    {[
                        "Menjalankan sistem quiz",
                        "Menampilkan leaderboard",
                        "Analisis performa pengguna",
                        "Meningkatkan layanan",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 4,
        icon: "💾",
        title: "Penyimpanan Data",
        content: (
            <ul className="space-y-2 mt-2">
                {[
                    "Data disimpan secara aman menggunakan layanan backend (misalnya Supabase)",
                    "Kami berupaya menjaga keamanan data pengguna setiap saat",
                ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                        <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        ),
    },
    {
        id: 5,
        icon: "🤝",
        title: "Pembagian Data",
        content: (
            <p>
                Kami <strong className="text-white font-medium">tidak menjual</strong> data pengguna
                kepada pihak ketiga. Data hanya digunakan untuk kepentingan internal aplikasi.
            </p>
        ),
    },
    {
        id: 6,
        icon: "🍪",
        title: "Cookies & Tracking",
        content: (
            <>
                <p>Kami dapat menggunakan:</p>
                <ul className="space-y-2 mt-2">
                    {["Cookies untuk sesi login", "Tracking sederhana untuk analytics"].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 7,
        icon: "🔒",
        title: "Keamanan Data",
        content: (
            <>
                <p>Kami menerapkan langkah-langkah untuk:</p>
                <ul className="space-y-2 mt-2">
                    {["Melindungi data dari akses tidak sah", "Mencegah kebocoran data"].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-slate-500 text-sm">Namun, tidak ada sistem yang 100% aman.</p>
            </>
        ),
    },
    {
        id: 8,
        icon: "🙋",
        title: "Hak Pengguna",
        content: (
            <>
                <p>Pengguna berhak:</p>
                <ul className="space-y-2 mt-2">
                    {[
                        "Mengakses data mereka",
                        "Meminta penghapusan akun",
                        "Menghentikan penggunaan layanan",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: 9,
        icon: "📅",
        title: "Retensi Data",
        content: (
            <p>Data disimpan selama akun aktif atau sesuai kebutuhan layanan.</p>
        ),
    },
    {
        id: 10,
        icon: "🔄",
        title: "Perubahan Kebijakan",
        content: (
            <p>
                Kami dapat memperbarui kebijakan ini sewaktu-waktu. Perubahan akan diinformasikan
                melalui aplikasi.
            </p>
        ),
    },
    {
        id: 11,
        icon: "📬",
        title: "Kontak",
        content: (
            <>
                <p>Jika ada pertanyaan terkait privasi, silakan hubungi:</p>
                <ul className="space-y-2 mt-2">
                    <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-1 text-xs shrink-0">▸</span>
                        <span>
                            Email:{" "}
                            <a
                                href="mailto:hello@quizarena.id"
                                className="text-teal-400 hover:underline font-medium"
                            >
                                hello@quizarena.id
                            </a>
                        </span>
                    </li>
                </ul>
            </>
        ),
    },
];

export default function PrivacyPage() {
    const [activeSection, setActiveSection] = useState<number | null>(null);

    const toggle = (id: number) => setActiveSection((prev) => (prev === id ? null : id));

    return (
        <div className="min-h-screen quiz-pattern overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-teal-500/10 blur-[120px]" />
                <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-primary/3 blur-[200px]" />
            </div>

            {/* ── Page ── */}
            <main className="max-w-3xl mx-auto px-5 py-18">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center space-y-4 mb-12 pb-12 border-b border-teal-500/20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/25 text-sm text-teal-500">
                        🔐 Privacy Document
                    </motion.div>
                    <motion.h1
                        className="text-5xl sm:text-6xl font-poppins tracking-tighter font-extrabold flex flex-col"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                    >
                        <span className="text-foreground">Kebijakan </span>
                        <span className="text-teal-400">Privasi</span>
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
                        <span>🔒 Data Aman</span>
                    </motion.div>
                </motion.div>

                {/* Highlight cards */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8 sm:grid-cols-3">
                    {highlights.map((h, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, type: "spring", delay: (i + 5) / 10 }}
                            key={i}
                            className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4 text-center hover:bg-teal-500/15 hover:border-teal-500/25 transition-all"
                        >
                            <div className="text-2xl mb-2">{h.icon}</div>
                            <div className="font-bold text-sm mb-1">{h.title}</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">{h.desc}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Accordion */}
                <div className="flex flex-col gap-2.5">
                    {sections.map((sec, i) => {
                        const isOpen = activeSection === sec.id;
                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, type: "spring", delay: (i + 10) / 10 }}
                                key={sec.id}
                                onClick={() => toggle(sec.id)}
                                className={`rounded-2xl border cursor-pointer transition-all duration-250 overflow-hidden bg-teal-500/5 ${isOpen
                                    ? "border-teal-500/35 shadow-[0_8px_32px_rgba(20,184,166,0.08)]"
                                    : "border-teal-500/10 hover:border-teal-500/25 hover:shadow-[0_4px_24px_rgba(20,184,166,0.06)]"
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3.5 px-5 py-4 select-none">
                                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[0.72rem] font-bold text-teal-400 shrink-0">
                                        {String(sec.id).padStart(2, "0")}
                                    </div>
                                    <span className="text-lg shrink-0">{sec.icon}</span>
                                    <span className="flex-1 font-bold text-[0.93rem] text-white">{sec.title}</span>
                                    <span
                                        className={`text-[0.6rem] shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-teal-400" : "text-slate-600"
                                            }`}
                                    >
                                        ▼
                                    </span>
                                </div>

                                {/* Collapsible body */}
                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                        }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="px-5 pb-5 pt-4 pl-17 text-sm leading-7 text-slate-400 border-t border-white/[0.05]">
                                            {sec.content}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer note */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="mt-10 p-5 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-center text-sm text-muted-foreground leading-7">
                    <p>Kami berkomitmen menjaga privasi Anda. Ada pertanyaan? Hubungi kami kapan saja.</p>
                    <p>
                        Baca juga{" "}
                        <Link href="/terms" className="text-teal-400 hover:underline font-medium">
                            Syarat & Ketentuan
                        </Link>{" "}
                        penggunaan QuizArena.
                    </p>
                </motion.div>

                {/* Bottom switcher */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="flex justify-center gap-3 mt-8 flex-wrap">
                    <Button variant={'ghost'} className="px-6 py-5! bg-teal-600 hover:bg-teal-400" asChild>
                        <Link
                            href="/terms"
                            className=""
                        >
                            📄 Lihat Syarat & Ketentuan →
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