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
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/career",
        destination: "/insights/activities",
        permanent: true,
      },
      {
        source: "/career/activities",
        destination: "/insights/activities",
        permanent: true,
      },
      {
        source: "/career/activities/:path*",
        destination: "/insights/activities/:path*",
        permanent: true,
      },
      {
        source: "/career/jobs",
        destination: "/insights/activities",
        permanent: true,
      },
      {
        source: "/career/jobs/:path*",
        destination: "/insights/activities",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
