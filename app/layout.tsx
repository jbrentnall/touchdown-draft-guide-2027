import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Touchdown | Draft Guide",
  description: "The Touchdown's interactive NFL Draft Guide - the big board and full scouting profiles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="team">{children}</body>
    </html>
  );
}
