"use server";

import { AuthError } from "@supabase/supabase-js";
import { formLoginSchema, formRegisterSchema } from "./formSchema";
import { createClient } from "@/supabase/server";

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

    return {
      message: "Login berhasil!",
      success: true,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message: error.message,
        success: false,
      };
    } else {
      console.log(error);
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
  console.log(formData);
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
          full_name: namaLengkap,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/`,
      },
    });

    if (error) throw error;

    return {
        message: "Register berhasil!",
        success: true
    }
  } catch (error) {
    console.log(error);
    return {
        message: "Register gagal",
        success: false
    }
  }
};
