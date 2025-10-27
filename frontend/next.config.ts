import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly pin the workspace root so Turbopack ignores lockfiles higher up the tree
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
