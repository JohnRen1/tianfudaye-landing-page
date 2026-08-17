import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const lanHost = process.env.TAX_LAN_IP || '192.168.0.133'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: projectDir,
  },
  // 手机通过局域网访问 Next dev 时，允许 HMR 与客户端资源完成 hydration。
  allowedDevOrigins: [lanHost, 'localhost', '127.0.0.1'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
