import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DemoStoreProvider } from "@/components/discovery/demo-store";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freework",
  description:
    "Marketplace donde empresas publican problemas y freelancers proponen diferentes soluciones. Descubre oportunidades y crea Matches.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>
        <DemoStoreProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-154px)]">{children}</main>
          <SiteFooter />
        </DemoStoreProvider>
      </body>
    </html>
  );
}
