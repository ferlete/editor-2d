import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TranslationProvider from "@/i18n/TranslationProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Editor 2D",
  description: "SENAI Empresa",
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en">
      <body className={inter.className}>
      <TranslationProvider>
        {children}
      </TranslationProvider>
      </body>
      </html>
  );
}
