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
              Flex column with the footer pushed down, so short pages still put the version at the
              bottom of the viewport rather than floating under the content.
            */}
            <body className={`${inter.className} min-h-screen flex flex-col`}>
                <div className="flex-1">{children}</div>
                {/*
                  The version is here for users, not for us: small print that quietly says the
                  product is being worked on. Read from package.json, the single source of truth —
                  see docs/workflow/versioning.md. This is a server component, so package.json is
                  not shipped to the browser.
                */}
                <footer className="py-4 text-center text-xs text-muted-foreground">
                    v{version}
                </footer>
            </body>
        </html>
    );
}
