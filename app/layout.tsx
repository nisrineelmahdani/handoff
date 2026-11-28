import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handoff | Logs to issue reports",
  applicationName: "Handoff",
  description: "Redact developer logs in your browser, draft an issue on-device, and review any cloud edits before accepting them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
