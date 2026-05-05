import { BackgroundMesh } from "@/components/BackgroundMesh";
import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Barlow_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fontDisplay = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontSans = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Party Pulse", template: "%s · Party Pulse" },
  description:
    "Real-time like and dislike for the music at your event. Built for house parties and campus events.",
  openGraph: {
    title: "Party Pulse",
    description: "Real-time music feedback for your party crowd.",
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontSans.variable}`}
    >
      <body className="bg-[#080808] font-sans text-zinc-100">
        <BackgroundMesh />
        {children}
      </body>
    </html>
  );
}
