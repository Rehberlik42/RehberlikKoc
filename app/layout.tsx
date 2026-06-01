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
  metadataBase: new URL("https://www.mindorarehberlik.com"),
  title: "MINDORA — Yapay Zeka Destekli Eğitim Koçluğu",
  description:
    "YKS, LGS ve ara sınıflar için yapay zeka destekli rehberlik ve koçluk platformu. Kişiselleştirilmiş program, deneme analizi ve DORA AI asistanı.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://www.mindorarehberlik.com",
    siteName: "MINDORA",
    title: "MINDORA — Yapay Zeka Destekli Eğitim Koçluğu",
    description:
      "YKS, LGS ve ara sınıflar için yapay zeka destekli rehberlik ve koçluk platformu.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MINDORA — Yapay Zeka Destekli Eğitim Koçluğu",
    description:
      "YKS, LGS ve ara sınıflar için yapay zeka destekli rehberlik ve koçluk platformu.",
    images: ["/og-image.png"],
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