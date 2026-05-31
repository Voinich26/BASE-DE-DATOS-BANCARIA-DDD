/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    domains: ["localhost"],
    formats: ["image/avif", "image/webp"],
  },
  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Tree shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };

    // Code splitting
    config.optimization.splitChunks = {
      chunks: "all",
      cacheGroups: {
        default: false,
        vendors: false,
        commons: {
          name: "commons",
          chunks: "all",
          minChunks: 2,
        },
        // Framework chunks
        framework: {
          name: "framework",
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // UI library chunks
        ui: {
          name: "ui",
          test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
          priority: 30,
          enforce: true,
        },
        // Data fetching chunks
        data: {
          name: "data",
          test: /[\\/]node_modules[\\/](@tanstack)[\\/]/,
          priority: 20,
          enforce: true,
        },
      },
    };

    return config;
  },
  // Compression
  compress: true,
  // Production source maps
  productionBrowserSourceMaps: false,
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    // Use only the origin (scheme://host:port) for CSP to avoid path mismatches
    const apiOrigin = (() => {
      try {
        return new URL(apiUrl).origin;
      } catch {
        return apiUrl;
      }
    })();

    // Content Security Policy - Enterprise Grade
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts (nonce-based in prod ideally)
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline'",
      // Styles: self + inline (Tailwind generates inline styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images
      "img-src 'self' data: blob: https://localhost:*",
      // Connect: self + backend API origin + WebSocket
      `connect-src 'self' ${apiOrigin} wss://localhost:* ws://localhost:*`,
      // Frames - deny all for enterprise security
      "frame-src 'none'",
      "frame-ancestors 'none'",
      // Objects
      "object-src 'none'",
      // Base URI
      "base-uri 'self'",
      // Form action
      "form-action 'self'",
      // Worker sources
      "worker-src 'self' blob:",
      // Manifest
      "manifest-src 'self'",
      // Media
      "media-src 'self'",
      // Upgrade insecure requests
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Frame protection
          { key: "X-Frame-Options", value: "DENY" },
          // MIME type sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // XSS protection (legacy but still useful)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Permissions Policy - restrict sensitive features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          // HSTS - only in production
          ...(isDev ? [] : [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]),
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          // Cross-Origin Opener Policy
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Cross-Origin Resource Policy
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
