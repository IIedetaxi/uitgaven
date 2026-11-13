import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/register-sw";

export const metadata: Metadata = {
  title: "Uitgaven",
  description: "Uitgaven en voorraad bijhouden",
  appleWebApp: { capable: true, title: "Uitgaven", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#141210",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
