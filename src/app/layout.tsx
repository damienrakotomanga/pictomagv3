import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SiteGlobalHeader } from "@/components/site-global-header";

export const metadata: Metadata = {
  title: "Pictomag",
  description: "Prototype frontend du feed social video Pictomag",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white">
        <SiteGlobalHeader />
        <div className="min-h-full">{children}</div>
      </body>
    </html>
  );
}
