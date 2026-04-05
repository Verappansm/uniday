import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniDay - Award Ceremony Management",
  description: "University award ceremony event management system — RSVPs, check-ins, and seating.",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
