import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasil em Casas",
  description: "Cada pessoa, um lugar no mapa. Um Brasil inteiro para construir juntos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
