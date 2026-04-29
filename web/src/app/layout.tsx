import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const GA_ID = "G-JPJM9704MR";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nextPNG - AI-Native Vector Design Studio",
  description: "Design logos, icons, posters and graphics with AI. Open npng format — editable, diffable, version-controllable vector design files.",
  metadataBase: new URL("https://nextpng.org"),
  openGraph: {
    title: "nextPNG - AI-Native Vector Design Studio",
    description: "Design logos, icons, posters and graphics with AI. Open npng format — editable YAML vector graphics.",
    url: "https://nextpng.org",
    siteName: "nextPNG",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "nextPNG - AI-Native Vector Design Studio",
    description: "Design logos, icons, posters and graphics with AI. Open npng format — editable YAML vector graphics.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://nextpng.org",
  },
  keywords: ["AI design", "vector graphics", "logo maker", "icon design", "npng format", "text to design", "AI native", "YAML graphics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
