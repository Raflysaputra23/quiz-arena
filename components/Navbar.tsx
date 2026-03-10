"use client"

import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { History, LogIn, LogOut, User, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { toastSuccess } from "@/lib/toast";
import { useEffect, useState } from "react";
import LoadingScreen from "./LoadingScreen";

const Navbar = () => {
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const [scrolled, setScrolled] = useState<boolean>(false);
    const router = useRouter();

     useEffect(() => {
       const handleScrolled = () => {
             setScrolled(window.scrollY > 20)
       }
       
       document.addEventListener("scroll", handleScrolled);
       return () => document.removeEventListener("scroll", handleScrolled);
    }, []);

    if (authLoading) return <LoadingScreen />

    return (
        <header className={`fixed top-0 z-50 left-0 right-0 ${scrolled && 'border-b backdrop-blur-2xl'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center"
                    >
                        <Zap className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                    <span className="text-xl font-bold text-foreground tracking-tighter">Quiz<span className="text-primary">Arena</span></span>
                </div>
                <div className="flex items-center gap-3">
                    {(user && profile) ? (
                        <>
                            <Button
                                variant="primary"
                                className="flex items-center gap-2"
                                onClick={() => router.push("/history")}
                            >
                                <History className="w-4 h-4" />
                                <span className="hidden md:inline-block">Riwayat</span>
                            </Button>
                            <div className="flex items-center gap-2 bg-primary/10 border border-primary hover:bg-primary/50 rounded-lg px-3 py-2 transition">
                                <User className="w-4 h-4 text-primary" />
                                <span className="text-sm text-primary font-medium hidden md:inline-block">{profile.nama_lengkap}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { signOut(); toastSuccess("Berhasil keluar!"); }}
                                className="bg-destructive hover:bg-destructive/80"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => router.push("/login")}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Masuk
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Navbar
