import { toast } from "sonner"

export const toastSuccess = (text: string) => toast.success(text, { position: "top-right", style: { backgroundColor: "rgba(0,255,0,0.2)", backdropFilter: "blur(5px)", border: "1px solid rgba(0,255,0,0.5)", fontFamily: "var(--font-poppins)" } });

export const toastError = (text: string) => toast.error(text, { position: "top-right", style: { backgroundColor: "rgba(255,0,0,0.2)", backdropFilter: "blur(5px)", border: "1px solid rgba(255,0,0,0.5)", fontFamily: "var(--font-poppins)" } });