import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { RFQProvider } from "@/context/RFQContext";
import RFQDrawer from "@/components/RFQDrawer";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Shree Shyam Electronics | Biomedical Systems Catalog",
    template: "%s | Shree Shyam Electronics",
  },
  description:
    "Biomedical equipment portfolio — patient monitoring, ICU & critical care, operation theatre, diagnostics, imaging, laboratory, hospital furniture, oxygen & respiratory, and accessories.",
  keywords: [
    "biomedical equipment",
    "patient monitoring",
    "ICU equipment",
    "operation theatre",
    "diagnostic equipment",
    "medical imaging",
    "laboratory equipment",
    "hospital furniture",
    "respiratory care",
    "Shree Shyam Electronics",
  ],
  authors: [{ name: "Shree Shyam Electronics — Biomedical Systems" }],
  openGraph: {
    title: "Shree Shyam Electronics | Biomedical Systems Catalog",
    description:
      "Biomedical equipment portfolio — patient monitoring, ICU & critical care, operation theatre, diagnostics, imaging, laboratory, hospital furniture, oxygen & respiratory, and accessories.",
    type: "website",
    siteName: "Shree Shyam Electronics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-[var(--cyan)] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-[#06110e] focus:outline-none"
        >
          Skip to main content
        </a>
        <RFQProvider>
          <Nav />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <RFQDrawer />
        </RFQProvider>
      </body>
    </html>
  );
}
