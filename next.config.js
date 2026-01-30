/** @type {import('next').NextConfig} */
const nextConfig = {
	turbopack: {
		root: './',
	},
	// Keep native lancedb bindings external so Turbopack doesn't try to place them in ESM chunks
	serverExternalPackages: ["@lancedb/lancedb", "pdfkit", "fontkit"],
	webpack: (config, options) => {
		if (!options.isServer) {
			// Don't bundle lancedb on client side
			config.resolve.alias['@lancedb/lancedb'] = false;
		}
		return config;
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**',
			},
		],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload'
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block'
					},
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN'
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					}
				]
			}
		]
	}
};

module.exports = nextConfig;
