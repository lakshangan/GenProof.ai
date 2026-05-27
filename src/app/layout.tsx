import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#071114",
};

export const metadata: Metadata = {
  title: "Provenance Intelligence | GenProof.ai",
  description: "Verify and decode embedded C2PA Content Credentials, cryptographic signatures, and AI-generation metadata from media files.",
  keywords: ["C2PA", "Content Credentials", "Provenance", "AI Detection", "Metadata", "Cryptographic Verification"],
  authors: [{ name: "GenProof.ai" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "GenProof.ai — Provenance Intelligence",
    description: "Decode and verify cryptographic provenance signatures embedded in any image.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
