import type { Metadata } from "next";
import { B612, B612_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// B612: the typeface Airbus commissioned for cockpit displays, built for
// legibility at a glance in low light.
const b612 = B612({
  variable: "--font-b612",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const b612Mono = B612_Mono({
  variable: "--font-b612-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TakeoffFocus",
  description: "Fokus-Timer im Flugreise-Design",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`dark ${b612.variable} ${b612Mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
