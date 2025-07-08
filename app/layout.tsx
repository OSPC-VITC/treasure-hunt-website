import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Provider as JotaiProvider } from 'jotai';

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "treasure_hunt.exe",
  description: "treasure_hunt.exe by OSPC VITC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
          <JotaiProvider>

      <html lang="en">
        <link rel="manifest" href="/manifest.json" />
        <body className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}>
          {children}
        </body>
      </html>
          </JotaiProvider>

    </ClerkProvider>
  )
}
