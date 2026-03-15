/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createClient } from "@/supabase/client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

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
    pos_x?: number;
    pos_y?: number;
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
    submitAnswer: ({ answer, doublePoints }: { answer: string; doublePoints: boolean }) => Promise<void>;
    setCurrentRoom: (room: Room | null) => void;
    loadRoomByCode: (code: string) => Promise<boolean>;
    restoreParticipantSession: () => Promise<boolean>;
    clearParticipantSession: () => void;
    enterFullscreen: () => void;
    exitFullscreen: () => void;
}

const QuizContext = createContext<QuizContextType | null>(null);

const AVATARS = ["🦊", "🐱", "🐶", "🐸", "🦁", "🐼", "🐨", "🐯", "🦄", "🐙"];

const PARTICIPANT_STORAGE_KEY = "quizarena_participant";
const ROOM_CODE_STORAGE_KEY = "quizarena_room_code";


function saveParticipantToStorage(participant: Participant | null, roomCode?: string) {
    if (participant) {
        sessionStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(participant));
        if (roomCode) sessionStorage.setItem(ROOM_CODE_STORAGE_KEY, roomCode);
    } else {
        sessionStorage.removeItem(PARTICIPANT_STORAGE_KEY);
        sessionStorage.removeItem(ROOM_CODE_STORAGE_KEY);
    }
}

function loadParticipantFromStorage(): { participant: Participant | null; roomCode: string | null } {
    try {
        const raw = sessionStorage.getItem(PARTICIPANT_STORAGE_KEY);
        const roomCode = sessionStorage.getItem(ROOM_CODE_STORAGE_KEY);
        if (raw) return { participant: JSON.parse(raw), roomCode };
    } catch { }
    return { participant: null, roomCode: null };
}

export function QuizProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [currentParticipant, setCurrentParticipantState] = useState<Participant | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [hostPlaying, setHostPlaying] = useState(false);
    const subscriptionsRef = useRef<any[]>([]);
    const supaRef = useRef(createClient());
    const answeredParticipantsRef = useRef<Set<string>>(new Set());
    const currentQuestionIdRef = useRef<string | null>(null);


    // Wrapper to also persist to sessionStorage
    const setCurrentParticipant = useCallback((valOrFn: Participant | null | ((prev: Participant | null) => Participant | null)) => {
        setCurrentParticipantState((prev) => {
            const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
            const roomCode = currentRoom?.quiz.roomCode
            saveParticipantToStorage(next, roomCode)
            return next;
        });
    }, [currentRoom]);

    useEffect(() => {
        const supabase = supaRef.current;
        return () => {
            subscriptionsRef.current.forEach((sub) => {
                sub.unsubscribe();
                supabase.removeChannel(sub);
            });
        };
    }, []);

    const enterFullscreen = () => {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
    }

    const exitFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }


    const subscribeToSession = useCallback((sessionId: string) => {
        const supabase = supaRef.current;

        // cleanup old channels
        subscriptionsRef.current.forEach((sub) => {
            sub.unsubscribe();
            supabase.removeChannel(sub);
        });
        subscriptionsRef.current = [];

        const sessionChannel = supabase
            .channel(`session-${sessionId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "quiz_sessions",
                filter: `id=eq.${sessionId}`,
            }, (payload) => {
                const data = payload.new as any;
                setCurrentRoom((prev) => {
                    if (!prev) return prev;
                    const questionChanged = data.current_question_index !== prev.currentQuestionIndex;
                    if (questionChanged) {
                        answeredParticipantsRef.current.clear();
                        const question =
                            prev.quiz.questions[data.current_question_index];

                        currentQuestionIdRef.current = question?.id ?? null;
                    }
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
                event: "*",
                schema: "public",
                table: "session_participants",
                filter: `session_id=eq.${sessionId}`,
            }, (payload) => {
                if (payload.eventType === "INSERT") {
                    const p = payload.new as any;
                    setCurrentRoom((prev) => {
                        if (!prev) return prev;
                        const exists = prev.participants.find((x) => x.id === p.id);
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
                } else if (payload.eventType === "DELETE") {
                    const p = payload.old as any;
                    setCurrentRoom((prev) => {
                        if (!prev) return prev

                        answeredParticipantsRef.current.delete(p.id);
                        const updatedParticipants = prev.participants?.filter(x => x.id !== p.id) || []


                        return {
                            ...prev,
                            participants: updatedParticipants,
                            currentQuestionAnswerCount: Math.min(
                                prev.currentQuestionAnswerCount,
                                updatedParticipants.length
                            )
                        }
                    });
                } else if (payload.eventType === "UPDATE") {
                    const p = payload.new as any;

                    setCurrentRoom((prev) => {
                        if (!prev) return prev;

                        const updatedParticipants = prev.participants.map((x) =>
                            x.id === p.id
                                ? { ...x, score: p.score }
                                : x
                        ).sort((a, b) => b.score - a.score);

                        return {
                            ...prev,
                            participants: updatedParticipants
                        };
                    });
                }
            }).subscribe();

        const answersChannel = supabase
            .channel(`answers-${sessionId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "participant_answers",
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                const answer = payload.new as any;
                setCurrentRoom((prev) => {
                    if (!prev) return prev;

                    if (!answer?.participant_id) return prev;
                    if (!answer?.question_id) return prev;

                    if (answer.question_id !== currentQuestionIdRef.current) {
                        return prev;
                    }

                    if (answeredParticipantsRef.current.has(answer.participant_id)) {
                        return prev;
                    }

                    answeredParticipantsRef.current.add(answer.participant_id);
                    return {
                        ...prev,
                        currentQuestionAnswerCount: answeredParticipantsRef.current.size
                    }
                })
            })
            .subscribe();

        subscriptionsRef.current.push(sessionChannel, participantChannel, answersChannel);
    }, []);

    const loadRoomByCode = useCallback(async (code: string): Promise<boolean> => {
        const supabase = supaRef.current;
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

        setIsHost(user?.id === session.host_id);
        setCurrentRoom(room);
        subscribeToSession(session.id);
        currentQuestionIdRef.current =
            room.quiz.questions[room.currentQuestionIndex]?.id ?? null;
        return true;
    }, [subscribeToSession, user]);

    const createAndStartSession = useCallback(async (quizId: string, roomCode: string, userId: string): Promise<string> => {
        const newCode = Array.from({ length: 6 }, () =>
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
        ).join("");

        const supabase = supaRef.current;
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
        const supabase = supaRef.current;

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

        sessionStorage.setItem("joinedRoom", JSON.stringify({ code, participantId: participant.id }));
        await loadRoomByCode(code);
        return true;
    }, [loadRoomByCode, setCurrentParticipant]);

    const joinRoomAsHost = useCallback(async (sessionId: string, name: string): Promise<boolean> => {
        const avatar = "👑";
        const supabase = supaRef.current;
        const { data: participant, error } = await supabase
            .from("session_participants")
            .insert({ session_id: sessionId, guest_name: name, avatar })
            .select()
            .single();

        if (error || !participant) return false;
        sessionStorage.setItem(
            "joinedRoom",
            JSON.stringify({
                code: currentRoom?.quiz.roomCode,
                participantId: participant.id
            })
        )
        const newParticipant = {
            id: participant.id,
            name,
            avatar,
            score: 0,
            streak: 0,
            answers: {},
        }

        setCurrentParticipant(newParticipant);
        setCurrentRoom((prev) => {
            if (!prev) return prev

            const exists = prev.participants.some(p => p.id === participant.id)
            if (exists) return prev

            return {
                ...prev,
                participants: [...prev.participants, newParticipant]
            }
        })
        return true;
    }, [setCurrentParticipant, currentRoom]);

    const startQuiz = useCallback(async (mode?: string) => {
        if (!currentRoom) return;
        if (currentRoom.status !== "waiting") return;
        const supabase = supaRef.current;

        // If host wants to play, join as participant first
        if (hostPlaying && !currentParticipant) {
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("nama_lengkap")
                    .eq("id_user", user.id)
                    .single();
                const joined = await joinRoomAsHost(currentRoom.sessionId, profile?.nama_lengkap || "Host");
                if (!joined) return
                await new Promise(r => setTimeout(r, 500));
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
    }, [currentRoom, hostPlaying, currentParticipant, joinRoomAsHost, user]);

    const nextQuestion = useCallback(async () => {
        if (!currentRoom) return;
        answeredParticipantsRef.current.clear();
        const nextQuestion = currentRoom.quiz.questions[currentRoom.currentQuestionIndex + 1];
        currentQuestionIdRef.current = nextQuestion?.id ?? null;

        const nextIdx = currentRoom.currentQuestionIndex + 1;

        const supabase = supaRef.current;
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

    const submitAnswer = useCallback(async ({ answer, doublePoints }: { answer: string; doublePoints: boolean }) => {
        if (!currentRoom || !currentParticipant) return;
        const question = currentRoom.quiz.questions[currentRoom.currentQuestionIndex];
        if (!question) return;
        if (currentParticipant.answers[question.id]) return;

        const supabase = supaRef.current;
        const timeTaken = (Date.now() - currentRoom.questionStartTime) / 1000;

        let correct = false;
        if (question.type === "multiple_choice") {
            correct = answer === question.correctAnswer;
        } else {
            correct = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        }

        const timeBonus = correct ? Math.max(0, Math.round((1 - timeTaken / question.timeLimit) * question.points * 0.5)) : 0;
        let points = correct ? question.points + timeBonus : 0;
        if (doublePoints) points *= 2;

        const { error: insertError } = await supabase.from("participant_answers").insert({
            session_id: currentRoom.sessionId,
            participant_id: currentParticipant.id,
            question_id: question.id,
            answer,
            time_taken: timeTaken,
            is_correct: correct,
            points_earned: points,
        });

        if (insertError) {
            console.error("Participant insert error:", insertError);
            return;
        }

        answeredParticipantsRef.current.add(currentParticipant.id)

        setCurrentRoom(prev => {
            if (!prev) return prev

            return {
                ...prev,
                currentQuestionAnswerCount: answeredParticipantsRef.current.size
            }
        })

        const { error } = await supabase.rpc("increment_score", {
            participant_id: currentParticipant.id,
            points
        });

        if (error) {
            console.error("Increment score error:", error);
        }

        const newStreak = correct ? (currentParticipant.streak || 0) + 1 : 0;

        setCurrentParticipant((prev) => prev ? {
            ...prev,
            score: prev.score + points,
            streak: newStreak,
            answers: { ...prev.answers, [question.id]: { answer, time: timeTaken, correct, points } },
        } : prev);
    }, [currentRoom, currentParticipant, setCurrentParticipant]);

    // Restore participant from sessionStorage (call on PlayQuiz/Lobby mount)
    const restoreParticipantSession = useCallback(async (): Promise<boolean> => {
        if (currentParticipant && currentRoom) return true; // already have participant
        const { participant: saved, roomCode } = loadParticipantFromStorage();
        if (!saved || !saved.id) return false;
        const supabase = supaRef.current;

        // Verify participant still exists in DB
        const { data: dbParticipant } = await supabase
            .from("session_participants")
            .select("*, quiz_sessions(status, room_code)")
            .eq("id", saved.id)
            .single();

        if (!dbParticipant) {
            saveParticipantToStorage(null);
            return false;
        }

        const session = (dbParticipant as any).quiz_sessions;
        if (!session || session.status === "finished") {
            saveParticipantToStorage(null);
            return false;
        }

        // Restore participant with fresh score from DB
        const restored: Participant = {
            ...saved,
            score: dbParticipant.score,
        };
        setCurrentParticipant(restored);

        // Also load the room if not loaded
        if (!currentRoom && (roomCode || session.room_code)) {
            await loadRoomByCode(roomCode || session.room_code);
        }

        return true;
    }, [currentParticipant, currentRoom, loadRoomByCode, setCurrentParticipant]);

    // Clear participant session (call when navigating to Home / leaving)
    const clearParticipantSession = useCallback(async () => {
        const joined = sessionStorage.getItem("joinedRoom");
        if (!joined) return;

        let parsed;
        try {
            parsed = JSON.parse(joined);
        } catch {
            sessionStorage.removeItem("joinedRoom");
            return;
        }

        const { code, participantId } = parsed;
        if (code && participantId) {
            const supabase = supaRef.current;
            const { data: session } = await supabase
                .from("quiz_sessions")
                .select("id, status")
                .eq("room_code", code)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
            if (session && session.status != "finished") {
                await supabase
                    .from("session_participants")
                    .delete()
                    .eq('id', participantId)
                    .eq('session_id', session.id);
            }
        }

        saveParticipantToStorage(null);
        setCurrentParticipant(null);
        sessionStorage.removeItem("joinedRoom");
    }, [setCurrentParticipant]);

    return (
        <QuizContext.Provider
            value={{
                currentRoom, currentParticipant, isHost, hostPlaying, setHostPlaying,
                createAndStartSession, joinRoom, startQuiz, nextQuestion,
                submitAnswer, setCurrentRoom, loadRoomByCode,
                restoreParticipantSession, clearParticipantSession,
                enterFullscreen, exitFullscreen
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
