"use client"

import { motion } from "framer-motion"
import { Gamepad2, Plus, Trophy } from "lucide-react"
const Works = () => {
    return (
        <section className="py-20 px-4 relative">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-px bg-linear-to-r from-transparent via-border to-transparent" />
            </div>
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-3xl md:text-5xl font-poppins font-bold text-foreground">
                        Cara <span className="text-gradient">Bermain</span>
                    </h2>
                    <p className="text-muted-foreground max-w-xl mx-auto text-md">
                        Hanya butuh 3 langkah sederhana untuk mulai bermain
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { step: "01", title: "Buat atau Gabung", desc: "Buat quiz baru atau masukkan kode game untuk bergabung dengan teman", icon: Plus },
                        { step: "02", title: "Pilih Mode", desc: "Normal, Speed, atau Survival — pilih tantangan yang sesuai", icon: Gamepad2 },
                        { step: "03", title: "Main & Menang!", desc: "Jawab soal secepat mungkin, raih skor tertinggi dan jadi juara!", icon: Trophy },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            className="text-center space-y-4"
                        >
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-10 blur-xl" />
                                <div className="relative w-20 h-20 rounded-2xl glass flex items-center justify-center">
                                    <item.icon className="w-8 h-8 text-primary" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                                    {item.step}
                                </div>
                            </div>
                            <h3 className="font-poppins font-bold text-xl text-foreground">{item.title}</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-60 mx-auto">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Works
