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
  async rewrites() {
    const workspaceServerUrl =
      process.env.WORKSPACE_SERVER_URL || "http://localhost:4000";

    return [
      {
        source: "/workspace-realtime/connect",
        destination: `${workspaceServerUrl}/socket.io/`,
      },
      {
        source: "/workspace-realtime/yjs/:path*",
        destination: `${workspaceServerUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // MediaPipe tasks-vision WASM + face_landmarker.task model (~15MB
        // combined, versioned by filename). Self-hosted under public/mediapipe;
        // promote to immutable so the CDN holds them for a year.
        source: "/mediapipe/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Avatar GLBs (talkinghead-avaturn.glb is ~13MB and effectively never
        // changes). Default public/ headers are short-lived, so repeat
        // interview-room visits re-download/revalidate. Promote to immutable.
        source: "/interview/avatar/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Interview room background images — stable binaries.
        source: "/interview/backgrounds/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Portfolio background images — stable binaries.
        source: "/portfolio-backgrounds/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Other public images: cache a day with stale-while-revalidate so
        // repeat views skip refetch while content updates still propagate
        // (avoids the stale-forever risk of immutable on same-filename swaps).
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
