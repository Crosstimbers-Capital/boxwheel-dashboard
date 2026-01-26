/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode for easier development
  // Enable in production if desired
  reactStrictMode: false,

  // Suppress punycode deprecation warning from mssql
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
