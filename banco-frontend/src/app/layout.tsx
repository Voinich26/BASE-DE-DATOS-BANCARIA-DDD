import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { RootProviders } from "@/components/providers/RootProviders";
import { SplashScreen } from "@/components/shared/SplashScreen";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "BancoDDD — Enterprise Banking",
    template: "%s | BancoDDD",
  },
  description: "Plataforma bancaria enterprise con arquitectura DDD",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0d1b2a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BancoDDD" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <RootProviders>
          <SplashScreen minDuration={800} />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(222 47% 9%)",
                border: "1px solid hsl(222 47% 14%)",
                color: "hsl(213 31% 91%)",
              },
              classNames: {
                success: "!border-emerald-500/30",
                error: "!border-red-500/30",
                warning: "!border-yellow-500/30",
                info: "!border-blue-500/30",
              },
            }}
          />
        </RootProviders>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var r of registrations) { r.unregister(); }
                });
                caches.keys().then(function(keys) {
                  keys.forEach(function(k) { caches.delete(k); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
