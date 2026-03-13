import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { PersonaProvider } from "@/components/providers/PersonaProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Birana",
  description: "Birana - automated book rental system",
};

import { LanguageProvider } from "@/components/providers/LanguageProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${playfair.variable} antialiased`}>
        <QueryProvider>
          <SocketProvider>
            <LanguageProvider>
              <PersonaProvider>
                <ToastProvider />
                {children}
              </PersonaProvider>
            </LanguageProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
