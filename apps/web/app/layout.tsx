import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { AuthBoundary } from "@/components/auth/auth-boundary";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { publicPageMetadata, siteBaseUrl } from "@/lib/site-metadata";
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
  metadataBase: siteBaseUrl,
  ...publicPageMetadata(
    "MatchWork | Problemas que encuentran solución",
    "Publica un problema, descubre propuestas de profesionales y haz Match para continuar la conversación.",
    "",
  ),
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
          <ToastProvider>
            <AuthBoundary>{children}</AuthBoundary>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
