/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";

const RafAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_APIKEY,
});

export const generateQuis = async (prompt: string, files: File[]) => {
  try {
    let contents: any = "";
    if (files.length > 0) {
      const fileBuffer = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        fileBuffer.push({
          mimeType: file.type,
          buffer: buffer.toString("base64"),
        });
      }
      contents = fileBuffer.map((file) => ({
        inlineData: {
          mimeType: file.mimeType,
          data: file.buffer,
        },
      }));
      contents.push({text: prompt});
    } else {
      contents = prompt;
    }

    const response = await RafAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: `
Anda adalah asissten yang dibuat untuk generate soal Quiz, 
jika user ingin membuat soal dengan contoh topik, MTK, SAINS, dan apapun itu 
anda harus membuat soal yang relevan dengan topik yang diberikan, 
jawaban anda harus berupa string json saja contoh struktur jsonnya seperti ini:
{
  "title": "Kuis Matematika",
  "description": "Uji kemampuan matematika Anda dengan soal-soal tingkat menengah.",
  "questions": [
    {
      "type": "multiple_choice",
      "text": "Jika 3x + 7 = 22, berapakah nilai x?",
      "options": [
        { "label": "A", "text": "3" },
        { "label": "B", "text": "5" },
        { "label": "C", "text": "7" },
        { "label": "D", "text": "9" }
      ],
      "correct_answer_label": "B",
      "time_limit": 20,
      "points": 1000
    },
  ]
}
anda harus menjawab persis seperti itu untuk struktur jsonnya, jika pengguna juga mengirim sebuah file pdf atau gambar, anda harus membuat soal dengan referensi file yang diberikan ya, dan nanti pengguna akan meminta membuat soal dan mengirimkan topik, jumlah soal, dan levelnya,
anda harus menjawab sesuai dengan perintah pengguna ya dan anda harus menjawab struktur jsonnya seperti di responSchema.`,
        maxOutputTokens: 4080,
        temperature: 0.7,
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["multiple_choice"] },
                  text: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        text: { type: "string" },
                      },
                    },
                  },
                  correct_answer_label: { type: "string" },
                  time_limit: { type: "number" },
                  points: { type: "number" },
                },
              },
            },
          },
        },
      },
    });
    return response.text;
  } catch (error) {
    console.log("Generate Quiz Gagal:", error);
    throw new Error("Generate Quiz Gagal!");
  }
};
