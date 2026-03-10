import z from "zod";

export const formLoginSchema = z.object({
    email: z.email("Email harus valid"),
    password: z.string().min(6, "Password minimal 6 karakter")
});

export const formRegisterSchema = z.object({
    namaLengkap: z.string().min(3, "Nama Lengkap minimal 3 karakter"),
    email: z.email("Email harus valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string().min(6, "Password minimal 6 karakter")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak sama",
    path: ["confirmPassword"]
})