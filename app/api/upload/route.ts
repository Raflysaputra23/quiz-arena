import { del, put } from "@vercel/blob";
import { type NextRequest } from "next/server";

export const POST = async (req: Request) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return new Response(JSON.stringify({ message: "File tidak ditemukan" }), {
      status: 500,
    });
  }

  if (file.size > (5 * 1024 * 1024)) {
    return new Response(
      JSON.stringify({ message: "Ukuran file maksimal 5MB" }),
      {
        status: 500,
      },
    );
  }

  const filename = `${crypto.randomUUID()}-${file.name}`;
  try {
    const blob = await put(filename, file, {
      access: "public",
    });

    return new Response(
      JSON.stringify({
        url: blob.url,
        pathname: blob.pathname,
        message: "File berhasil diupload",
      }),
      {
        status: 200,
      },
    );
  } catch(error) {
    console.log(error);
    return new Response(JSON.stringify({ message: "Gagal mengupload file" }), {
      status: 500,
    });
  }
};


export const DELETE = async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get("url");
  if(!url) {
    return new Response(JSON.stringify({ message: "URL tidak ditemukan" }), {
      status: 500,
    });
  }

  try {
    await del(url);
    return new Response(JSON.stringify({ message: "File berhasil dihapus" }), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ message: "Gagal menghapus file" }), {
      status: 500,
    });
  }
}