import type { Metadata } from "next";
import { Public_Sans, Red_Hat_Text } from "next/font/google";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { MotionObserver } from "@/components/ui/MotionObserver";
// Before globals.css, so the PermitPike overrides of Leaflet win.
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Red Hat Text (SIL OFL) for all UI text. Variable font, weights 300 to 700.
const redHatText = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-red-hat-text",
  display: "swap",
});

// The logo's wordmark only: "PermitPike" in Public Sans Bold (SIL OFL), as drawn.
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
    <html lang="en" className={`${redHatText.variable} ${publicSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-base text-ink antialiased">
        <Header />
        <main className="mx-auto max-w-page px-4 py-8 sm:px-6">{children}</main>
        <MotionObserver />
      </body>
    </html>
  );
}
