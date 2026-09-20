import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { version } from "../../package.json";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "LightVerse - Bible Verse Memorization",
    description: "Memorize Bible verses through daily SMS reminders with progressive cloze deletion",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            {/*
              `relative` so the footer can be positioned against the document rather than the
              viewport — it should sit at the bottom of the page, not follow the user around.
            */}
            <body className={`${inter.className} relative min-h-screen`}>
                {children}
                {/*
                  The version is here for users, not for us: small print that quietly says the
                  product is being worked on. Read from package.json, the single source of truth —
                  see docs/workflow/versioning.md. This is a server component, so package.json is
                  not shipped to the browser.

                  Deliberately *overlaid* on the page rather than stacked below it, and with no
                  background of its own. Every page wrapper is `min-h-screen` with its own gradient
                  — and three different ones end at three different colours (blue-100, indigo-100,
                  white). A footer in normal flow would sit below all of them on the plain body
                  background, showing as a white strip under a coloured page, and no single footer
                  colour could match every page. Overlaying it means the page's own background
                  shows through, so it always matches whatever is behind it.
                */}
                <footer className="absolute inset-x-0 bottom-0 py-3 text-center text-xs text-muted-foreground pointer-events-none">
                    v{version}
                </footer>
            </body>
        </html>
    );
}
