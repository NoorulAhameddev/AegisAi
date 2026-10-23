/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: require("path").resolve(__dirname, "../.."),
  },
};
module.exports = nextConfig;
