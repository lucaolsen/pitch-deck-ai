import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EBANX Sales AI — Pitch Deck Builder",
  description:
    "Generate professional, data-driven sales pitch decks powered by AI. Built for EBANX sales teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
