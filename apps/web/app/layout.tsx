import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { AuthBoundary } from "@/components/auth/auth-boundary";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const displayFont = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "MatchWork",
  description:
    "Publica un problema, encuentra propuestas de talento y haz Match con quien puede resolverlo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
      data-scroll-behavior="smooth"
      lang="es"
    >
      <body>
        <AuthProvider>
          <AuthBoundary>{children}</AuthBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
