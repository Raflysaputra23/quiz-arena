
export interface Logs {
    id: string;
    type: "auth" | "quiz" | "security" | "admin";
    action: string;
    user: string;
    time: string;
    severity: "warning" | "info" | "danger";
}

