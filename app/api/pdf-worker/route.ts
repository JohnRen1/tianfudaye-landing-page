import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const workerFilePath = join(
  process.cwd(),
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.min.js',
);

/**
 * 提供稳定的同源 PDF.js worker，避免移动 WebView 加载 Next 动态 chunk 失败。
 */
export async function GET() {
  const content = await readFile(workerFilePath, 'utf8');
  return new Response(content, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
