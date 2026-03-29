"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, History, Mail, Plus, Search, User2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toastError, toastSuccess } from "@/lib/toast";
import LoadingScreen from "@/components/LoadingScreen";
import QuizHistory from "@/components/QuizHistory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, updateLog, loading: authLoading, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const displayName = profile?.nama_lengkap?.trim() || user?.email?.split("@")[0] || "Pengguna";
  const email = user?.email ?? profile?.email ?? "—";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError("Ukuran foto maksimal 5MB");
      return;
    }
    setUploading(true);
    try {
      if (profile?.avatar_url) {
        const res = await fetch(`/api/upload?url=${encodeURIComponent(profile.avatar_url)}`, {
          method: "DELETE"
        });
        await updateLog({ type: "quiz", action: "Gambar gagal dihapus", user: profile?.nama_lengkap ?? "uknown", severity: "danger" })
        if (res.status !== 200) throw Error("Gagal hapus gambar");
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        await updateLog({ type: "quiz", action: "Gagal mengupload gambar", user: profile?.nama_lengkap ?? "uknown", severity: "info" })
        toastError(data?.message ?? "Gagal mengunggah foto");
        return;
      }
      const { error } = await updateProfile({ avatar_url: data.url });
      if (error) {
        toastError("Gagal menyimpan foto profil");
        return;
      }
      await updateLog({ type: "quiz", action: "Berhasil mengupload gambar", user: profile?.nama_lengkap ?? "uknown", severity: "info" })
      toastSuccess("Foto profil diperbarui");
    } catch {
      toastError("Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return <LoadingScreen />;
  if (!user || !profile) return <LoadingScreen />;

  return (
    <div className="min-h-screen quiz-pattern overflow-hidden relative">
      {/* EFEK GLOW */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary/10  blur-[120px]" />
        <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-primary/3 blur-[200px]" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <header className="flex bg-primary/5 items-center gap-4 px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => router.push("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <User2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-poppins font-bold text-foreground">Profile</span>
        </div>
        <div className="ml-auto">
          <Button variant={'primary'} onClick={() => router.push("/create")}>
            <Plus className="w-4 h-4 mr-1" />
            Buat Quiz
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass rounded-3xl p-6 sm:p-8 border border-primary/15 shadow"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <button
              type="button"
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
              className="group relative rounded-full mx-auto sm:mx-0 shrink-0 ring-4 ring-primary/25 ring-offset-4 ring-offset-background/80 transition hover:ring-primary/40 focus:outline-none focus-visible:ring-primary disabled:opacity-60"
              aria-label="Ubah foto profil"
            >
              <Avatar className="size-28 sm:size-32 text-lg font-poppins font-bold">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="" className="object-cover" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md border-2 border-background transition group-hover:scale-105">
                {uploading ? (
                  <span className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </span>
            </button>


            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div>
                <div>
                  <p className="text-xs font-poppins font-semibold uppercase tracking-wider text-primary/90 mb-1">Nama</p>
                  <h1 className="font-poppins text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
                    {displayName}
                  </h1>
                </div>
              </div>
              <div className="inline-flex sm:flex items-center justify-center sm:justify-start gap-3 rounded-2xl bg-secondary/40 border border-border/80 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-poppins font-semibold uppercase tracking-wider text-primary mb-0.5">
                    Email
                  </p>
                  <p className="text-sm sm:text-base text-foreground break-all">{email}</p>
                </div>
              </div>
              {profile.created_at && (
                <p className="text-xs text-muted-foreground">
                  Bergabung sejak{" "}
                  {new Date(profile.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-poppins text-xl font-bold text-foreground flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                  <History className="w-4 h-4 text-primary-foreground" />
                </span>
                Riwayat quiz
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Quiz dan sesi yang pernah kamu buat</p>
            </div>
            {profile?.role === "admin" &&
              <Button variant={'primary'} asChild>
                <Link href={'/admin'}>
                  Admin
                </Link>
              </Button>
            }
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="sticky top-5 z-50"
          >
            <div>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cari quiz berdasarkan judul"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-secondary border-border h-12 rounded-xl"
              />
            </div>
          </motion.div>
          <QuizHistory search={search} />
        </motion.section>
      </main>
    </div>
  );
}
