"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/supabase/client";

interface Profile {
    id_user: string;
    nama_lengkap: string | null;
    avatar_url: string | null;
    jurusan: string | null;
    kelas: string | null;
    bio: string | null;
    role: string | null;
    email: string | null;
    created_at: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: any }>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const supabase = createClient();

    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        if (userId) {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id_user", userId)
                .single();
            setProfile(data as Profile | null);
        } else {
            setProfile(null);
        }
    };


    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        (async () => {
            if (user) await fetchProfile(user.id);
        })()
    }, [user]);

    const signUp = async (email: string, password: string, fullName: string) => {
        const { error, data } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: window.location.origin,
            },
        });

        if (!error) {
            const { error: error2 } = await supabase.from("profiles").insert({
                id_user: data?.user?.id,
                nama_lengkap: fullName,
                email,
                role: "user",
            });
            
            return { error: error2 };
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/dashboard`,
            },
        });
        return { error };
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: "Not authenticated" };
        const { error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id_user", user.id);
        if (!error) await fetchProfile(user.id);
        return { error };
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, signInWithGoogle, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}