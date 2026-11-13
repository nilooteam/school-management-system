import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: data:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "connect-src 'self' https: wss: http://127.0.0.1:8787 http://localhost:8787",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Include Prisma's runtime WebAssembly engine in standalone output.
  outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/*.wasm"] },
  reactStrictMode: false,
  // Presence of the webpack() customization below makes Next 16 demand an
  // explicit builder choice; this empty config keeps the default
  // (Turbopack) build valid for standalone/any-host builds.
  turbopack: {},
  poweredByHeader: false,
  // Type checking is enforced separately before release.
  typescript: { ignoreBuildErrors: true },
  // Shrink the module graph the bundler has to hold in memory.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    cpus: 2,
  },
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
    ];
  },
  async redirects() {
    return [
      { source: "/introduce", destination: "/plans", permanent: true },
    ];
  },
};

export default nextConfig;
