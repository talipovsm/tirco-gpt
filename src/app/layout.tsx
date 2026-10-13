import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tirco — цифровые международные грузоперевозки", template: "%s · Tirco" },
  description: "Единая платформа: грузы, ставки, договоры, водители, трекинг и документы международных перевозок.",
  applicationName: "Tirco",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
