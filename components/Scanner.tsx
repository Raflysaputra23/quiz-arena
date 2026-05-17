"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toastError } from "@/lib/toast";
import { useQuiz } from "@/hooks/useQuiz";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Scanner = () => {
    const { joinRoom } = useQuiz();
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const [loading, setLoading] = useState(false);
    const [lastScan, setLastScan] = useState("");
    const [joining, setJoining] = useState(false);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
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

    useEffect(() => {
        if (lastScan) {
            setShowJoin(true);
            setCode(lastScan);
            scannerRef.current?.stop();
        }
    }, [lastScan]);

    useEffect(() => {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        scanner.start(
            {
                facingMode: "environment",
            },
            {
                fps: 10,
                qrbox: {
                    width: 250,
                    height: 250,
                },
                aspectRatio: 1,
            },

            async (decodedText) => {
                if (scanningRef.current) return;
                scanningRef.current = true;

                setLoading(true);
                try {
                    setLastScan(decodedText);

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
            },

            (err) => {

            }
        );
    }, []);

    return (
        <div className="fixed inset-0 bg-black">

            {showJoin && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass rounded-2xl p-6 max-w-md mx-auto space-y-4"
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
                            onClick={() => setShowJoin(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant={'primary'}
                            className="flex-1 group"
                            onClick={handleJoin}
                            onSubmit={handleJoin}
                            disabled={joining}
                        >
                            {joining ? <span className="flex items-center gap-2">Bergabung <Loader2 className="animate-spin" /></span> : "Gabung"}
                        </Button>
                    </div>
                </motion.div>
            )}

            <div
                id="reader"
                className="w-full h-full"
            />

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-65 h-65 border-4 border-white rounded-2xl overflow-hidden">
                    <div className="absolute w-full h-1 bg-red-500 rounded-xl animate-scan" />
                </div>
            </div>

            {loading && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-xl">
                    Check code...
                </div>
            )}

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-xl">
                {lastScan || "Waiting scan..."}
            </div>

        </div>
    );
};

export default Scanner;