import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { MotionObserver } from "@/components/ui/MotionObserver";
// Before globals.css, so the PermitPike overrides of Leaflet win.
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Archivo (Omnibus-Type, SIL OFL), with its width axis so headings can run wide.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// The logo's wordmark only (Public Sans Bold, SIL OFL). UI text is Archivo.
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PermitPike",
  description: "AI permit desk for residential electrical permits in Boston.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${publicSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-base text-ink antialiased">
        <Header />
        <main className="mx-auto max-w-page px-4 py-8 sm:px-6">{children}</main>
        <MotionObserver />
      </body>
    </html>
  );
}
