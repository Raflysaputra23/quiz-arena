"use client"

import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, LogOut, User, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { toastSuccess } from "@/lib/toast";
import { useEffect, useState } from "react";
import LoadingScreen from "./LoadingScreen";

const Navbar = () => {
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const [scrolled, setScrolled] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
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
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => router.push("/profile")}
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden md:inline-block">Profile</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setShowModal(true) }}
                                className="bg-destructive cursor-pointer hover:bg-destructive/80"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            className="cursor-pointer"
                            onClick={() => router.push("/login")}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Masuk
                        </Button>
                    )}
                </div>
            </div>

            {/* MODAL LOGOUT */}
            <AnimatePresence mode="wait">
                {showModal &&
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowModal(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass rounded-3xl p-6 max-w-lg w-full space-y-5 max-h-[85vh]"
                        >
                            <h1 className="text-2xl font-bold font-poppins">Keluar</h1>
                            <p className="text-muted-foreground">Anda yakin ingin keluar dari akun ini?</p>
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => { signOut(); toastSuccess("Berhasil keluar!"); setShowModal(false); }}
                                >
                                    Keluar
                                </Button>
                                <Button
                                    size="sm"
                                    className="cursor-pointer"
                                    variant="primary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Batal
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                }
            </AnimatePresence>
        </header>
    )
}

export default Navbar
