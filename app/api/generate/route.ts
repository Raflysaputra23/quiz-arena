import { generateQuis } from "@/lib/rafai";

export async function POST(req: Request) {
  const reqBody = await req.json();
  const { topik, jumlah, level } = reqBody;
  try {
    const response = await generateQuis(`Topik: ${topik}, Jumlah Soal: ${jumlah}, Tingkat Kesulitan: ${level}`);
    return new Response(JSON.stringify({ res: response, message: "Generate Quis Berhasil!" }), {
      status: 200
    })
  } catch(error) {
    return new Response(JSON.stringify({ res: null, message: error }), {
      status: 500
    })
  }


}
