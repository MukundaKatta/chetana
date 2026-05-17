import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Chetana — Exploring Artificial Consciousness",
  description:
    "An interactive research platform for testing AI consciousness indicators. Run audits against the Butlin et al. framework across 6 theories and 14 indicators.",
  keywords: [
    "AI consciousness",
    "artificial consciousness",
    "consciousness testing",
    "Butlin framework",
    "GWT",
    "IIT",
    "Vedanta",
    "AI sentience",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: '#030712' }}>
      <head>
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-950">
        {children}
      </body>
    </html>
  );
}
