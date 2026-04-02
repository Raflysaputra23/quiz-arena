"use server";

import { AuthError } from "@supabase/supabase-js";
import { formLoginSchema, formRegisterSchema } from "./formSchema";
import { createClient } from "@/supabase/server";
import { Logs } from "@/types/global";

export const formLoginValidation = async (
  prev: unknown,
  formData: FormData,
) => {
  const supabase = await createClient();
  const data = Object.fromEntries(formData.entries());
  const validasi = formLoginSchema.safeParse(data);

  if (!validasi.success) {
    return {
      error: validasi.error.flatten().fieldErrors,
      message: "Data tidak valid!",
      successa: false,
    };
  }

  const { email, password } = validasi.data;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    await supabase.from("logs").insert({
      type: "security",
      action: `User berhasil login`,
      user: data.nama_lengkap ?? "uknown",
      severity: "info",
    });

    return {
      message: "Login berhasil!",
      success: true,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      await supabase.from("logs").insert({
        type: "security",
        action: `User gagal login: ${error.message}`,
        user: data.nama_lengkap ?? "uknown",
        severity: "danger",
      } as Logs);

      return {
        message: error.message,
        success: false,
      };
    } else {
      await supabase.from("logs").insert({
        type: "security",
        action: `User gagal login: ${error}`,
        user: data.nama_lengkap ?? "uknown",
        severity: "danger",
      } as Logs);
      return {
        message: "Ada kesalahan sistem!",
        success: false,
      };
    }
  }
};

export const formRegisterValidation = async (
  prev: unknown,
  formData: FormData,
) => {
  const supabase = await createClient();
  const data = Object.fromEntries(formData.entries());
  const validasi = formRegisterSchema.safeParse(data);

  if (!validasi.success) {
    return {
      error: validasi.error.flatten().fieldErrors,
      message: "Data tidak valid!",
      success: false,
    };
  }

  const { namaLengkap, email, password } = validasi.data;

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama_lengkap: namaLengkap,
          termsAccept: true,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/`,
      },
    });

    if (error) throw error;

    await supabase.from("logs").insert({
      type: "security",
      action: `User berhasil register`,
      user: data.nama_lengkap ?? "uknown",
      severity: "info",
    });

    return {
      message: "Register berhasil!",
      success: true,
    };
  } catch (error) {
    // ADD LOG
    await supabase.from("logs").insert({
      type: "security",
      action: `User gagal register: ${error}`,
      user: data.nama_lengkap ?? "uknown",
      severity: "danger",
    });

    return {
      message: "Register gagal",
      success: false,
    };
  }
};
