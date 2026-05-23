import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // Tree-shake side-effect-free barrel imports (lucide-react has 1000+ icons,
    // framer-motion bundles heavy runtime even for unused exports).
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
  reactStrictMode: false,
  // Skip generating .map files for production browser bundles. They balloon
  // .next/static (~40% extra) and Vercel never serves them by default anyway.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Skulpt runtime + stdlib are >1MB combined static assets fetched by
        // the playground at first interaction. Default Next.js public/ headers
        // are short-lived; promote to immutable so Vercel's CDN can hold them
        // for a year and skip revalidation.
        source: "/libs/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Skulpt worker script — same rationale as /libs above.
        source: "/workers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
