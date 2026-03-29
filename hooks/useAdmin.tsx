/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Option } from "./useQuiz";
import { Profile } from "./useAuth";
import { createClient } from "@/supabase/client";


export interface Logs {
    id: string;
    type: "auth" | "quiz" | "security" | "admin";
    action: string;
    user: string;
    time: Date;
    severity: "warning" | "info" | "danger";
}

export type Users = {
    quizzes: number
    status: "suspend" | "active";
} & Profile;



export interface QuestionOptions {
    id: string;
    image_url: string;
    points: number;
    question: string;
    time_limit: number;
    correct: string;
    type: "multiple_choice" | "short_answer";
    options: Option[];
}

export interface Quizzes {
    id: string;
    user: string;
    title: string;
    description: string;
    jumlah_soal: number;
    jumlah_sesi: number;
    created_at: Date;
    questions: QuestionOptions[];
}

interface AdminContextType {
    users: Users[];
    quiz: Quizzes[];
    logs: Logs[];
    loading: boolean;
    loadingQuiz: boolean;
    loadingUser: boolean;
    loadQuiz: () => void;
    loadUsers: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const [users, setUsers] = useState<Users[]>([]);
    const [quiz, setQuiz] = useState<Quizzes[]>([]);
    const [logs, setLogs] = useState<Logs[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingUser, setLoadingUser] = useState<boolean>(true);
    const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
    const [loadingQuiz, setLoadingQuiz] = useState<boolean>(true);
    const supaRef = useRef(createClient());

    const loadUsers = async () => {
        try {
            setLoadingUser(true);
            const supabase = supaRef.current;
            const { data, error } = await supabase
                .from("profiles")
                .select("*, quizzes(count)");
            if (error) throw Error("User gagal diambil");
            const filtered = data.map(d => ({ ...d, quizzes: d.quizzes.length > 0 ? d.quizzes[0].count : 0 }));
            setUsers(filtered as Users[]);
        } catch (error) {
            setUsers([]);
            console.log(error);
        } finally {
            setLoadingUser(false);
        }
    }

    const loadLogs = async () => {
        try {
            setLoadingLogs(true);
            const supabase = supaRef.current;
            const { data, error } = await supabase
                .from("logs")
                .select("*");
            if (error) throw Error("Logs gagal diambil");
            setLogs(data as Logs[]);
        } catch (error) {
            setLogs([]);
            console.log(error);
        } finally {
            setLoadingLogs(false);
        }
    }

    const loadQuiz = async () => {
        try {
            setLoadingQuiz(true);
            const supabase = supaRef.current;
            const { data, error } = await supabase
                .from("quiz_sessions")
                .select("*, quizzes(*, questions(*, question_options(*)), profiles(nama_lengkap))")
                .order("created_at", { ascending: false });
            if (error) throw Error("Question gagal diambil");
            const sesi = new Map();
            const dataQuiz: Quizzes[] = [];
            console.log(data);
            data.forEach((dq) => {
                if (!sesi.has(dq.quiz_id)) {
                    sesi.set(dq.quiz_id, 1);
                    dataQuiz.push({
                        id: dq.quiz_id,
                        user: dq.quizzes.profiles.nama_lengkap,
                        title: dq.quizzes.title,
                        description: dq.quizzes.description,
                        jumlah_soal: dq.quizzes.questions.length,
                        jumlah_sesi: 1,
                        created_at: dq.quizzes.created_at,
                        questions: dq.quizzes.questions.map((q: any) => ({
                            id: q.id,
                            image_url: q.image_url,
                            points: q.points,
                            question: q.text,
                            correct: q.correct_answer,
                            time_limit: q.time_limit,
                            type: q.type,
                            options: q.question_options.map((o: any) => ({
                                id: o.id,
                                text: o.text,
                                label: o.label
                            }))
                        }))
                    });
                } else {
                    sesi.set(dq.quiz_id, sesi.get(dq.quiz_id) + 1);
                    const found = dataQuiz.find(q => q.id === dq.quiz_id);
                    if (found) found.jumlah_sesi++;
                }
            });
            setQuiz(dataQuiz as Quizzes[]);
        } catch (error) {
            setQuiz([]);
            console.log(error);
        } finally {
            setLoadingQuiz(false);
        }
    }

    useEffect(() => {
        (async () => {
            await loadUsers();
            await loadLogs();
            await loadQuiz();
        })();
    }, []);


    useEffect(() => {
        if (!loadingLogs && !loadingQuiz && !loadingUser) {
            setLoading(false);
        } 
    }, [loadingLogs, loadingQuiz, loadingUser])

    return (
        <AdminContext.Provider value={{ users, quiz, logs, loading, loadingQuiz, loadingUser, loadQuiz, loadUsers }}>
            {children}
        </AdminContext.Provider>
    )
}

export const useAdmin = () => {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
    return ctx;
}
