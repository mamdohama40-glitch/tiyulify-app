import type { Metadata } from "next";
import { Inter } from "next/font/point";
import "./globals.css";
// הוסף את השורה הזו כאן:
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: "Tiyulify",
  description: "בניית מסלולים חכמה",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}