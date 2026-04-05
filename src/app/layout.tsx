import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniDay - Award Ceremony Management",
  description: "University award ceremony event management system — RSVPs, check-ins, and seating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
