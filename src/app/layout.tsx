import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenProof.ai — Provenance Intelligence",
  description: "Verify and decode embedded C2PA Content Credentials, cryptographic signatures, and AI-generation metadata from media files.",
  keywords: ["C2PA", "Content Credentials", "Provenance", "AI Detection", "Metadata", "Cryptographic Verification"],
  authors: [{ name: "GenProof.ai" }],
  openGraph: {
    title: "GenProof.ai — Provenance Intelligence",
    description: "Decode and verify cryptographic provenance signatures embedded in any image.",
    type: "website",
  }
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
