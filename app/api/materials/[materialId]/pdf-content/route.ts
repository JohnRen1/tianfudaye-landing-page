import { NextRequest, NextResponse } from 'next/server';
import { getClaimedMaterialViewUrl } from '@/lib/db';
import { fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ materialId: string }>;
}

/**
 * 为网页 PDF 渲染器代理已领取的 PDF 文件。
 * 明确返回 inline PDF，避免移动 WebView 把存储签名链接当作下载任务处理。
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  const { materialId } = await params;
  if (!materialId) return fail('INVALID_MATERIAL_ID', '资料编号不能为空', 400);

  try {
    const material = await getClaimedMaterialViewUrl({ userId: ctx.userId, materialId });
    if (material.format !== 'pdf') {
      return fail('MATERIAL_PREVIEW_UNSUPPORTED', '仅 PDF 文件支持网页预览', 422);
    }

    const upstream = await fetch(material.viewUrl);
    if (!upstream.ok || !upstream.body) {
      return fail('MATERIAL_PREVIEW_FAILED', '资料预览加载失败，请稍后重试', 502);
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(material.name)}.pdf`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'MATERIAL_NOT_CLAIMED') return fail('MATERIAL_NOT_CLAIMED', '请先下载资料后再查看', 403);
    if (message === 'MATERIAL_NOT_FOUND') return fail('MATERIAL_NOT_FOUND', '资料不存在或已下架', 404);
    return fail('MATERIAL_PREVIEW_FAILED', '资料预览加载失败，请稍后重试', 500, message);
  }
}
