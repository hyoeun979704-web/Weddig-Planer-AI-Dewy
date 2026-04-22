import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React Konva requires client-side rendering
  transpilePackages: ['konva', 'react-konva'],
}

export default nextConfig
