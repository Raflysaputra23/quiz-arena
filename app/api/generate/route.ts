import { generateQuis } from "@/lib/generateQuis";

export async function POST(req: Request) {
  const formData = await req.formData();
  const topik = (formData.get('topik') as string);
  const jumlah = (formData.get('jumlah') as string);
  const level = (formData.get('level') as string);
  const files = (formData.getAll('files') as File[]) ?? [];

  try {
    const response = await generateQuis(`Topik: ${topik}, Jumlah Soal: ${jumlah}, Tingkat Kesulitan: ${level}`, files);
    return new Response(JSON.stringify({ res: response, message: "Generate Quis Berhasil!" }), {
      status: 200
    })
  } catch(error) {
    return new Response(JSON.stringify({ res: null, message: error }), {
      status: 500
    })
  }
}
