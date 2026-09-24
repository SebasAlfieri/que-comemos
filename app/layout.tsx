import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
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
  title: "¿Qué comemos Beluu?",
  description: "Que mierda comemos?!?!?",
  openGraph: {
    type: "website",
    siteName: "¿Qué Comemos?",
    images: [
      {
        url: "/opengraph.png",
        width: 1080,
        height: 1080,
        alt: "belulita",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <main className="main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
