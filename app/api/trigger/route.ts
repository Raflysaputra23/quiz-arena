import { createClient } from "@/supabase/server"

export const GET = async () => {
    const supabase = await createClient();
    const { error } = await supabase.from('logs').select('*').limit(1);
    if(error) return new Response(JSON.stringify({ message: "Gagal" }), { status: 500 });
    return new Response(JSON.stringify({ message: "Berhasil" }), { status: 200 });
}