import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import GlobalLoading from "@/components/GlobalLoading";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fluency Lab",
  description: "AI-powered speech coaching for ESL learners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.className}>
        <GlobalLoading />
        {children}
      </body>
    </html>
  );
}
