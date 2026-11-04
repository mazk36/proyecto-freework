import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { AuthBoundary } from "@/components/auth/auth-boundary";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { browserSupportScript } from "@/lib/browser-support";
import { publicPageMetadata, siteBaseUrl } from "@/lib/site-metadata";
import "./globals.css";

// Fonts are not preloaded: preload requests compete with the render-blocking stylesheet on slow connections.
// next/font ships size-adjusted fallbacks, so the swap does not shift the layout.
const bodyFont = Inter({
  preload: false,
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const displayFont = Sora({
  preload: false,
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
});

const monoFont = JetBrains_Mono({
  preload: false, // monospace figures are secondary; avoid preloading them on the critical path of public pages
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

// viewport-fit=cover hace que env(safe-area-inset-*) valga algo en iPhone (muesca, barra de inicio); las barras fijas ya lo usan.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
      lang="es-PE"
    >
      <body>
        {/* Constante propia (sin contenido de usuario): avisa a navegadores sin color-mix() o :is() en lugar de dejar la página rota. */}
        <script dangerouslySetInnerHTML={{ __html: browserSupportScript }} />
        <AuthProvider>
          <ToastProvider>
            <AuthBoundary>{children}</AuthBoundary>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
