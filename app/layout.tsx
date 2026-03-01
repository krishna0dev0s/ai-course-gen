import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Provider from "./provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "VidAI Course Generator",
  description: "Generate AI-powered course outlines, chapter previews, and study notes in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="relative overflow-x-hidden bg-[#0a0a12] text-white min-h-screen">
          <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -bottom-48 -left-48 h-[700px] w-[700px]
              bg-gradient-to-r from-purple-500/15 to-indigo-500/10
              blur-[160px] rounded-full
              animate-pulse"
            />

            <div
              className="absolute top-[-300px] left-1/4 h-[650px] w-[650px]
              bg-gradient-to-r from-pink-500/10 to-rose-400/8
              blur-[160px] rounded-full
              animate-[float_12s_ease-in-out_infinite]"
            />

            <div
              className="absolute bottom-[-250px] right-1/4 h-[650px] w-[650px]
              bg-gradient-to-r from-blue-500/10 to-cyan-400/8
              blur-[160px] rounded-full
              animate-[float_18s_ease-in-out_infinite]"
            />

            <div
              className="absolute top-[-250px] right-[-200px] h-[700px] w-[700px]
              bg-gradient-to-r from-sky-500/10 to-indigo-400/8
              blur-[180px] rounded-full
              animate-[float_15s_ease-in-out_infinite]"
            />
          </div>
          <Provider>{children}<Toaster position="top-center" richColors={true} /></Provider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
