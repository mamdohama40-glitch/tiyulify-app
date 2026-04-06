import type { Metadata } from "next";
import { Inter } from "next/font/google"; // וודא שזה מגיע מ-google ולא מ-point
import "./globals.css";

// הגדרת הפונט שחסרה לך
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tiyulify",
  description: "Explore springs and nature in Israel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}