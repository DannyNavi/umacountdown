import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is opened at 127.0.0.1 while Next allows localhost by default.
  allowedDevOrigins: ["127.0.0.1"],
  // The dev badge sits on the map and covers the pin form.
  devIndicators: false,
  // Allow embedding under the Uma Countdown shell at /exile.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://umacountdown.nguyen-danny142.workers.dev https://*.nguyen-danny142.workers.dev",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
