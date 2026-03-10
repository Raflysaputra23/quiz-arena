import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { QuizProvider } from "@/hooks/useQuiz";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});


export const metadata = {
  title: {
    default: "QuizArena | Aplikasi Kuis Interaktif Real-Time",
    template: "%s | QuizArena",
  },

  description:
    "QuizArena adalah aplikasi kuis interaktif real-time yang memungkinkan Anda membuat, membagikan, dan memainkan kuis bersama teman atau peserta secara langsung. Cocok untuk pembelajaran, pelatihan, dan hiburan.",

  authors: [
    {
      name: "Rafly",
      url: "https://rafly-portofolio.vercel.app/",
    },
  ],

  keywords: [
    "QuizArena",
    "aplikasi kuis",
    "quiz app",
    "kuis online",
    "kuis realtime",
    "game kuis multiplayer",
    "quiz multiplayer",
    "kuis interaktif",
    "aplikasi kuis pendidikan",
    "online quiz game",
    "Next.js quiz app",
    "realtime quiz platform",
    "kuis untuk kelas",
    "quiz competition app",
  ],

  openGraph: {
    title: "QuizArena: Aplikasi Kuis Interaktif Real-Time",
    description:
      "Buat dan mainkan kuis interaktif secara real-time bersama teman atau peserta lainnya. QuizArena menghadirkan pengalaman kuis multiplayer yang cepat, seru, dan kompetitif.",

    url: process.env.NEXT_PUBLIC_URL_DOMAIN,

    siteName: "QuizArena",

    images: [
      {
        url: `${process.env.NEXT_PUBLIC_URL_DOMAIN}/quiz-arena-logo.png`,
        width: 1200,
        height: 630,
        alt: "QuizArena Real-Time Quiz Application",
      },
    ],

    locale: "id_ID",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} antialiased overflow-x-hidden overflow-y-auto`}
      >
        <AuthProvider>
          <QuizProvider>
            <Toaster />
            {children}
          </QuizProvider>
        </AuthProvider>
      </body>
    </html >
  );
}
