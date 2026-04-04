import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Deduplicate three.js to avoid multiple instances
    config.resolve.alias = {
      ...config.resolve.alias,
      three: require.resolve('three'),
    };
    
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/three/ },
      /Multiple instances of three\.js/,
      /THREE\..*deprecated/,
    ];
    return config;
  }
};

export default nextConfig;
