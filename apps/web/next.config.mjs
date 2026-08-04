/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  // unsafe-eval required in dev for Next.js HMR source maps
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Google Fonts stylesheet + inline styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts files
  "font-src 'self' https://fonts.gstatic.com",
  // Images: own origin + Google/Yelp venue photos
  "img-src 'self' data: blob: https://*.googleusercontent.com https://places.googleapis.com https://maps.googleapis.com https://*.yelpcdn.com",
  // API calls: Supabase realtime + REST
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    '@groupplan/ai',
    '@groupplan/db',
    '@groupplan/types',
    '@groupplan/venues',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
