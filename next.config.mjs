import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLanAddresses } from './scripts/lan-addresses.mjs'

const projectDir = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
