import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/tiger-mark.svg" },
  title: "Quotation Analytics Dashboard",
  description:
    "Interactive dashboard connected to Google Sheets quotation data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
