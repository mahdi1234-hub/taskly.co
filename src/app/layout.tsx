import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskly - AI-Powered Document Analytics",
  description: "Analyze, search, and understand your documents with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] antialiased">
        {children}
      </body>
    </html>
  );
}
