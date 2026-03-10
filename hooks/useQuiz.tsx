/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createClient } from "@/supabase/client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export type QuestionType = "multiple_choice" | "short_answer";

export interface Option {
    id: string;
    text: string;
    label: string;
}

export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    options: Option[];
    correctAnswer: string;
    timeLimit: number;
    points: number;
    imageUrl?: string;
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    roomCode: string;
}

export interface Participant {
    id: string;
    name: string;
    avatar: string;
    score: number;
    streak: number;
    answers: Record<string, { answer: string; time: number; correct: boolean; points: number }>;
}

export interface Room {
    sessionId: string;
    quiz: Quiz;
    participants: Participant[];
    status: "waiting" | "playing" | "finished";
    currentQuestionIndex: number;
    questionStartTime: number;
    currentQuestionAnswerCount: number;
    mode: string;
}

interface QuizContextType {
    currentRoom: Room | null;
    currentParticipant: Participant | null;
    isHost: boolean;
    hostPlaying: boolean;
    setHostPlaying: (v: boolean) => void;
    createAndStartSession: (quizId: string, roomCode: string, userId: string) => Promise<string>;
    joinRoom: (code: string, name: string) => Promise<boolean>;
    startQuiz: (mode?: string) => Promise<void>;
    nextQuestion: () => Promise<void>;
    submitAnswer: (answer: string) => Promise<void>;
    setCurrentRoom: (room: Room | null) => void;
    loadRoomByCode: (code: string) => Promise<boolean>;
}

const QuizContext = createContext<QuizContextType | null>(null);

const AVATARS = ["🦊", "🐱", "🐶", "🐸", "🦁", "🐼", "🐨", "🐯", "🦄", "🐙"];

export function QuizProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [hostPlaying, setHostPlaying] = useState(false);
    const subscriptionsRef = useRef<any[]>([]);

    useEffect(() => {
        return () => {
            subscriptionsRef.current.forEach((sub) => supabase.removeChannel(sub));
        };
    }, []);

    const subscribeToSession = useCallback(async (sessionId: string) => {
        const sessionChannel = await supabase
            .channel(`session-${sessionId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "quiz_sessions",
                filter: `id=eq.${sessionId}`,
            }, (payload: any) => {
                const data = payload.new as any;
                setCurrentRoom((prev) => {
                    if (!prev) return prev;
                    const questionChanged = data.current_question_index !== prev.currentQuestionIndex;
                    return {
                        ...prev,
                        status: data.status,
                        currentQuestionIndex: data.current_question_index,
                        questionStartTime: data.question_start_time ? new Date(data.question_start_time).getTime() : prev.questionStartTime,
                        currentQuestionAnswerCount: questionChanged ? 0 : prev.currentQuestionAnswerCount,
                        mode: data.mode || prev.mode,
                    };
                });
            })
            .subscribe();

        const participantChannel = supabase
            .channel(`participants-${sessionId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "session_participants",
                filter: `session_id=eq.${sessionId}`,
            }, (payload: any) => {
                const p = payload.new as any;
                setCurrentRoom((prev) => {
                    if (!prev) return prev;
                    const exists = prev.participants.some((x) => x.id === p.id);
                    if (exists) return prev;
                    return {
                        ...prev,
                        participants: [...prev.participants, {
                            id: p.id,
                            name: p.guest_name || "Player",
                            avatar: p.avatar,
                            score: p.score,
                            streak: 0,
                            answers: {},
                        }],
                    };
                });
            })
            .subscribe();

        const answersChannel = supabase
            .channel(`answers-${sessionId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "participant_answers",
            }, async () => {
                const { data: participants } = await supabase
                    .from("session_participants")
                    .select("*")
                    .eq("session_id", sessionId);

                if (participants) {
                    // Get current session to know current question
                    const { data: session } = await supabase
                        .from("quiz_sessions")
                        .select("*, quizzes(*, questions(*))")
                        .eq("id", sessionId)
                        .single();

                    let answerCount = 0;
                    if (session) {
                        const quiz = session.quizzes as any;
                        const questions = (quiz?.questions || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
                        const currentQ = questions[session.current_question_index];
                        if (currentQ) {
                            const participantIds = participants.map((p: any) => p.id);
                            const { count } = await supabase
                                .from("participant_answers")
                                .select("*", { count: "exact", head: true })
                                .eq("question_id", currentQ.id)
                                .in("participant_id", participantIds);
                            answerCount = count || 0;
                        }
                    }

                    setCurrentRoom((prev) => {
                        if (!prev) return prev;
                        const updated = prev.participants.map((p) => {
                            const fresh = participants.find((d: any) => d.id === p.id);
                            return fresh ? { ...p, score: fresh.score } : p;
                        });
                        return { ...prev, participants: updated, currentQuestionAnswerCount: answerCount };
                    });
                }
            })
            .subscribe();

        subscriptionsRef.current.push(sessionChannel, participantChannel, answersChannel);
    }, []);

    const loadRoomByCode = useCallback(async (code: string): Promise<boolean> => {
        const { data: session } = await supabase
            .from("quiz_sessions")
            .select("*, quizzes(*, questions(*, question_options(*)))")
            .eq("room_code", code)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!session) return false;

        const quiz = session.quizzes as any;
        const questions: Question[] = (quiz.questions || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((q: any) => ({
                id: q.id,
                type: q.type as QuestionType,
                text: q.text,
                correctAnswer: q.correct_answer,
                timeLimit: q.time_limit,
                points: q.points,
                imageUrl: q.image_url || undefined,
                options: (q.question_options || [])
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((o: any) => ({ id: o.id, text: o.text, label: o.label })),
            }));

        const { data: participants } = await supabase
            .from("session_participants")
            .select("*")
            .eq("session_id", session.id);

        const room: Room = {
            sessionId: session.id,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description || "",
                questions,
                roomCode: code,
            },
            participants: (participants || []).map((p: any) => ({
                id: p.id,
                name: p.guest_name || "Player",
                avatar: p.avatar,
                score: p.score,
                streak: 0,
                answers: {},
            })),
            status: session.status as any,
            currentQuestionIndex: session.current_question_index,
            questionStartTime: session.question_start_time ? new Date(session.question_start_time).getTime() : 0,
            currentQuestionAnswerCount: 0,
            mode: (session as any).mode || "normal",
        };

        const { data: { user } } = await supabase.auth.getUser();
        setIsHost(user?.id === session.host_id);
        setCurrentRoom(room);
        subscribeToSession(session.id);
        return true;
    }, [subscribeToSession]);

    const createAndStartSession = useCallback(async (quizId: string, roomCode: string, userId: string): Promise<string> => {
        const newCode = Array.from({ length: 6 }, () =>
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
        ).join("");

        const { data, error } = await supabase
            .from("quiz_sessions")
            .insert({ quiz_id: quizId, host_id: userId, room_code: newCode, status: "waiting" })
            .select()
            .single();

        if (error || !data) throw error;

        await loadRoomByCode(newCode);
        setIsHost(true);
        return newCode;
    }, [loadRoomByCode]);

    const joinRoom = useCallback(async (code: string, name: string): Promise<boolean> => {
        const loaded = await loadRoomByCode(code);
        if (!loaded) return false;

        const { data: session } = await supabase
            .from("quiz_sessions")
            .select("id, status")
            .eq("room_code", code)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!session || session.status !== "waiting") return false;

        const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        const { data: participant, error } = await supabase
            .from("session_participants")
            .insert({ session_id: session.id, guest_name: name, avatar })
            .select()
            .single();

        if (error || !participant) return false;

        setCurrentParticipant({
            id: participant.id,
            name,
            avatar,
            score: 0,
            streak: 0,
            answers: {},
        });
        setIsHost(false);

        await loadRoomByCode(code);
        return true;
    }, [loadRoomByCode]);

    const joinRoomAsHost = useCallback(async (sessionId: string, name: string): Promise<boolean> => {
        const avatar = "👑";
        const { data: participant, error } = await supabase
            .from("session_participants")
            .insert({ session_id: sessionId, guest_name: name, avatar })
            .select()
            .single();

        if (error || !participant) return false;

        setCurrentParticipant({
            id: participant.id,
            name,
            avatar,
            score: 0,
            streak: 0,
            answers: {},
        });
        return true;
    }, []);

    const startQuiz = useCallback(async (mode?: string) => {
        if (!currentRoom) return;

        // If host wants to play, join as participant first
        if (hostPlaying && !currentParticipant) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("user_id", user.id)
                    .single();
                await joinRoomAsHost(currentRoom.sessionId, profile?.display_name || "Host");
            }
        }

        await supabase
            .from("quiz_sessions")
            .update({
                status: "playing",
                current_question_index: 0,
                question_start_time: new Date().toISOString(),
                mode: mode || "normal",
            })
            .eq("id", currentRoom.sessionId);
    }, [currentRoom, hostPlaying, currentParticipant, joinRoomAsHost]);

    const nextQuestion = useCallback(async () => {
        if (!currentRoom) return;
        const nextIdx = currentRoom.currentQuestionIndex + 1;
        if (nextIdx >= currentRoom.quiz.questions.length) {
            await supabase
                .from("quiz_sessions")
                .update({ status: "finished", finished_at: new Date().toISOString() })
                .eq("id", currentRoom.sessionId);
        } else {
            await supabase
                .from("quiz_sessions")
                .update({
                    current_question_index: nextIdx,
                    question_start_time: new Date().toISOString(),
                })
                .eq("id", currentRoom.sessionId);
        }
    }, [currentRoom]);

    const submitAnswer = useCallback(async (answer: string) => {
        if (!currentRoom || !currentParticipant) return;
        const question = currentRoom.quiz.questions[currentRoom.currentQuestionIndex];
        if (!question) return;

        const timeTaken = (Date.now() - currentRoom.questionStartTime) / 1000;

        let correct = false;
        if (question.type === "multiple_choice") {
            correct = answer === question.correctAnswer;
        } else {
            correct = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        }

        const timeBonus = correct ? Math.max(0, Math.round((1 - timeTaken / question.timeLimit) * question.points * 0.5)) : 0;
        const points = correct ? question.points + timeBonus : 0;

        await supabase.from("participant_answers").insert({
            participant_id: currentParticipant.id,
            question_id: question.id,
            answer,
            time_taken: timeTaken,
            is_correct: correct,
            points_earned: points,
        });

        await supabase
            .from("session_participants")
            .update({ score: currentParticipant.score + points })
            .eq("id", currentParticipant.id);

        const newStreak = correct ? (currentParticipant.streak || 0) + 1 : 0;

        setCurrentParticipant((prev) => prev ? {
            ...prev,
            score: prev.score + points,
            streak: newStreak,
            answers: { ...prev.answers, [question.id]: { answer, time: timeTaken, correct, points } },
        } : prev);
    }, [currentRoom, currentParticipant]);

    return (
        <QuizContext.Provider
            value={{
                currentRoom, currentParticipant, isHost, hostPlaying, setHostPlaying,
                createAndStartSession, joinRoom, startQuiz, nextQuestion,
                submitAnswer, setCurrentRoom, loadRoomByCode,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
}

export function useQuiz() {
    const ctx = useContext(QuizContext);
    if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
    return ctx;
}
