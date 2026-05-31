import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MINDORA — Yapay Zeka Destekli Eğitim Koçluğu",
  description:
    "YKS, LGS ve ara sınıflar için yapay zeka destekli rehberlik ve koçluk platformu. Kişiselleştirilmiş program, deneme analizi ve DORA AI asistanı.",
  icons: {
    icon: "/mindora-icon-transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}