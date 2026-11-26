import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import PrecargaFeriados from "@/components/PrecargaFeriados";
import { scriptTema } from "@/lib/tema";

export const metadata: Metadata = {
  title: "FuryNick",
  description: "Gestão de pedidos de férias, ausências e licenças",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Aplica o tema guardado (ou o do sistema) antes de pintar. */}
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <PrecargaFeriados />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
