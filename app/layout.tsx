import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Inter with its optical-size axis: tight, confident display cuts for the big
// numbers and headlines, open text cuts for everything small.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TakeoffFocus – Fokus, der abhebt",
  description:
    "Ein Fokus-Timer als Nachtflug: Wähle deine Dauer, steig ein und flieg über einen echten 3D-Globus, während du dich konzentrierst.",
};

export const viewport: Viewport = {
  themeColor: "#0b0e1a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`dark ${inter.variable} ${geistMono.variable} antialiased`}>
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
