import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceSettings } from "@/lib/workspace-store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TraceScope | LLM Observability",
  description:
    "Production-style LLM observability dashboard for traces, RAG debugging, evals, cost, and latency monitoring.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getWorkspaceSettings();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell
          workspaceName={settings.workspaceName}
          ownerName={settings.ownerName}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
