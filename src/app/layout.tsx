import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Cinzel } from "next/font/google";
import "@/app/globals.css";
import { AppearanceProvider } from "@/context/appearance-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });

export const metadata: Metadata = {
  title: "Celestial Elysium Hub",
  description:
    "Portale gaming con simulatore Hunger Games personalizzabile. Crea la tua arena, personalizza tributi ed eventi.",
};

export const viewport: Viewport = {
  themeColor: "#1a0a2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.variable} ${cinzel.variable} font-sans antialiased`}
      >
        <AppearanceProvider>{children}</AppearanceProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
