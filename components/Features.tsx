"use client"

import { motion } from "framer-motion"
import { BarChart3, Clock, Gauge, ImageIcon, Plus, Skull, Sparkles, Trophy, Users } from "lucide-react";

const Features = () => {
    const features = [
        { icon: Plus, title: "Buat Quiz Mudah", desc: "Buat quiz pilihan ganda atau isian singkat dalam hitungan menit. Tambahkan gambar untuk soal yang lebih menarik.", color: "from-primary to-accent" },
        { icon: Users, title: "Multiplayer Real-Time", desc: "Mainkan quiz bersama teman secara live. Semua pemain melihat soal dan menjawab secara bersamaan.", color: "from-accent to-primary" },
        { icon: Trophy, title: "Leaderboard Live", desc: "Lihat peringkat dan skor semua pemain secara real-time. Siapa yang paling cepat dan akurat?", color: "from-[hsl(var(--gold))] to-[hsl(var(--warning))]" },
        { icon: Gauge, title: "Mode Speed", desc: "Waktu menjawab semakin pendek setiap soal! Uji kecepatan berpikir kamu di bawah tekanan.", color: "from-[hsl(var(--warning))] to-[hsl(var(--destructive))]" },
        { icon: Skull, title: "Mode Survival", desc: "Salah 2 kali langsung tersingkir! Hanya yang paling pintar yang bisa bertahan sampai akhir.", color: "from-[hsl(var(--destructive))] to-primary" },
        { icon: Sparkles, title: "Power-Ups", desc: "Gunakan item spesial seperti 50:50, Waktu Tambahan, dan Poin Ganda untuk keuntungan strategis.", color: "from-primary to-[hsl(var(--gold))]" },
        { icon: Clock, title: "Timer Dinamis", desc: "Setiap soal punya batas waktu. Jawab lebih cepat untuk mendapat bonus poin tambahan!", color: "from-accent to-[hsl(var(--success))]" },
        { icon: BarChart3, title: "Riwayat & Statistik", desc: "Lihat semua riwayat quiz yang pernah kamu mainkan atau buat, lengkap dengan detail statistik.", color: "from-[hsl(var(--success))] to-accent" },
        { icon: ImageIcon, title: "Soal Bergambar", desc: "Tambahkan gambar pada setiap soal untuk membuat quiz lebih visual dan interaktif.", color: "from-primary to-[hsl(var(--success))]" },
    ];
    return (
        <section id="features" className="py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground font-poppins">
                        Fitur <span className="text-gradient">Lengkap</span> untuk Quiz Seru
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-md">
                        Semua yang kamu butuhkan untuk membuat pengalaman quiz yang tak terlupakan
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -6, transition: { duration: 0.2 } }}
                            className="glass rounded-2xl p-6 space-y-4 group relative overflow-hidden"
                        >
                            {/* Gradient glow on hover */}
                            <div className={`absolute inset-0 bg-linear-to-br ${f.color} h-full opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                            <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${f.color} flex items-center justify-center shadow-lg relative z-10`}>
                                <f.icon className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <h3 className="font-poppins font-bold text-lg text-foreground relative z-10">{f.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Features
