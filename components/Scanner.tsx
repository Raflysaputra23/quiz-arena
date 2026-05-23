"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toastError } from "@/lib/toast";
import { useQuiz } from "@/hooks/useQuiz";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, LogIn, X } from "lucide-react";

const Scanner = () => {
    const { joinRoom } = useQuiz();
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(false);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("Arahkan kamera ke QrCode");
    const [showJoin, setShowJoin] = useState(false);
    const scanningRef = useRef(false);
    const router = useRouter();

    const handleJoin = async () => {
        if (!code.trim()) { toastError("Masukkan kode game!"); return; }
        if (!name.trim()) { toastError("Masukkan nama kamu!"); return; }
        setJoining(true);

        try {
            const success = await joinRoom(code.trim().toUpperCase(), name.trim());
            if (success) {
                router.push(`/lobby/${code.trim().toUpperCase()}`);
            } else {
                toastError("Kode game tidak ditemukan atau sudah dimulai!");
            }
        } catch {
            toastError("Terjadi kesalahan!");
        } finally {
            setJoining(false);
        }
    };

    const handleScanSuccess = async (decodedText: string) => {
        if (scanningRef.current) return;
        scanningRef.current = true;

        setLoading(true);
        try {
            setMessage("Melakukkan scanning...")
            setCode(decodedText);

            if ("vibrate" in navigator) {
                navigator.vibrate(200);
            }

        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setTimeout(() => {
                scanningRef.current = false;
            }, 3000);
        }
    }

    const handleScanError = async () => {

    }

    const handleModal = useCallback((open: boolean) => {
        if (open) {
            setShowJoin(true);
            scannerRef.current?.stop();
        } else {
            setShowJoin(false);
            scannerRef.current?.start({ facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: {
                        width: 250,
                        height: 250,
                    },
                    aspectRatio: 1,
                },
                handleScanSuccess,
                handleScanError
            )
        }
    }, []);

    useEffect(() => {
        if (code) {
            handleModal(true);
        }
    }, [code, handleModal]);

    useEffect(() => {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        scanner.start({ facingMode: "environment" },
            {
                fps: 10,
                qrbox: {
                    width: 250,
                    height: 250
                },
                aspectRatio: 1,
            },
            handleScanSuccess,
            handleScanError
        );
    }, []);

    return (
        <div className="fixed inset-0 bg-black">
            <button onClick={() => router.push("/")} className="absolute w-10 cursor-pointer h-10 rounded-full bg-black/40 left-5 top-5 z-40 flex">
                <ArrowLeft className="m-auto" size={20} />
            </button>
            {showJoin && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed z-40 inset-0 bg-black/30 backdrop-blur-2xl"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass rounded-2xl p-6 w-72 max-w-87.5 mx-auto space-y-4"
                    >
                        <Input
                            placeholder="Nama kamu"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-secondary border-border h-12"
                            maxLength={20}
                        />
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 bg-destructive hover:bg-destructive/80 cursor-pointer"
                                onClick={() => handleModal(false)}
                            >
                                <X />
                                Batal
                            </Button>
                            <Button
                                variant={'primary'}
                                className="flex-1 group"
                                onClick={handleJoin}
                                onSubmit={handleJoin}
                                disabled={joining}
                            >
                                <LogIn />
                                {joining ? <span className="flex items-center gap-2">Bergabung <Loader2 className="animate-spin" /></span> : "Gabung"}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <div
                id="reader"
                className="w-full h-full"
            />

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative ${message == "Melakukkan scanning..." ? "border-primary animate-pulse" : "border-white"} transition z-10 w-63 h-63 border-4 overflow-hidden`}>
                    <div className="absolute w-full h-1 bg-red-500 rounded-xl animate-scan" />
                </div>
            </div>

            {loading && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-xl">
                    Check code...
                </div>
            )}

            <div className={`absolute ${code ? "bg-green-500/10 text-green-500" : "bg-black/50 text-white"} text-sm text-center bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl`}>
                {code ? "Scan Berhasil" : message}
            </div>

        </div>
    );
};

export default Scanner;