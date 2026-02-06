/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Image optimization
    images: {
        domains: [
            'img.clerk.com',  // Clerk user avatars
            'images.clerk.dev',
        ],
    },

    // TypeScript checking
    typescript: {
        // Allow builds even with type errors during development
        ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },

    // ESLint checking
    eslint: {
        ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
};

export default nextConfig;
