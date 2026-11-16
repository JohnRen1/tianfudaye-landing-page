import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLanAddresses } from './scripts/lan-addresses.mjs'

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const quizOrigin = 'https://labray-qa-system-266117-4-1300006268.sh.run.tcloudbase.com'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/qa-front', destination: `${quizOrigin}/` },
      { source: '/qa-front/:path*', destination: `${quizOrigin}/:path*` },
    ]
  },
  turbopack: {
    root: projectDir,
  },
  // 手机通过局域网访问 Next dev 时，允许 HMR 与客户端资源完成 hydration。
  allowedDevOrigins: [...getLanAddresses(), 'localhost', '127.0.0.1'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
