import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tally — Media Planning Platform",
  description:
    "Tally is the media planning and buying platform built by Sage Media Planning & Placement for political campaigns and issue advocacy organizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
