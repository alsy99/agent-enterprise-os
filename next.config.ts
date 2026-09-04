import type { NextConfig } from "next";

const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        // Set when deploying to https://<user>.github.io/<repo>/
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
        trailingSlash: true,
      }
    : {
        serverExternalPackages: ["better-sqlite3"],
      }),
};

export default nextConfig;
