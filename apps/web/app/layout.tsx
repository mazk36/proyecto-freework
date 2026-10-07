import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthBoundary } from "@/components/auth/auth-boundary";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freework",
  description:
    "Publica problemas, descubre soluciones y conecta con profesionales.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>
        <AuthProvider>
          <AuthBoundary>{children}</AuthBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
