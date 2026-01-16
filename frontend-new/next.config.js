/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Ensure Turbopack treats this package folder as the workspace root
    root: __dirname,
  },
}

module.exports = nextConfig;
