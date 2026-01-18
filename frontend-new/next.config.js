/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  turbopack: {
    // Ensure Turbopack treats this package folder as the workspace root
    root: __dirname,
  },
  // Keep outputFileTracingRoot in sync with turbopack.root to avoid warnings
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
