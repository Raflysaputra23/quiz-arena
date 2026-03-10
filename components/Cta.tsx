"use client"

import { motion } from "framer-motion"
import { Button } from "./ui/button"
import { Star, Zap } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { toastError } from "@/lib/toast"
const Cta = () => {
    const { user } = useAuth();
    const router = useRouter();

    const handleCreate = () => {
        if (!user) {
            toastError("Silakan login terlebih dahulu untuk membuat quiz!");
            router.push("/auth");
            return;
        }
        router.push("/create");
    };
    return (
        <section className="py-20 px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto glass rounded-3xl p-10 md:p-16 text-center space-y-6 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-primary opacity-[0.03]" />
                <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-accent/10 blur-[100px]" />

                <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="inline-flex"
                >
                    <Star className="w-12 h-12 text-gold" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-poppins font-bold text-foreground relative z-10">
                    Siap Untuk Tantangan?
                </h2>
                <p className="text-muted-foreground text-md max-w-md mx-auto relative z-10">
                    Buat quiz pertamamu sekarang atau gabung game teman dan buktikan siapa yang terpintar!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            size="lg"
                            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-md px-10 py-7 rounded-2xl"
                            onClick={handleCreate}
                        >
                            <Zap className="w-5 h-5 mr-1" />
                            Mulai Sekarang
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    )
}

export default Cta
